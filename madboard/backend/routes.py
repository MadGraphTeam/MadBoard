"""API routes for MadBoard backend."""

import json
import os
import queue as _queue
import shutil
import subprocess as _subprocess
import threading as _threading
import uuid as _uuid

from flask import (
    Blueprint,
    Response,
    current_app,
    request,
    send_file,
    stream_with_context,
)

api_bp = Blueprint("api", __name__)


# ── MadGraph task registry ────────────────────────────────────────────────────


class _Task:
    def __init__(self, task_id, name):
        self.id = task_id
        self.name = name
        self.status = "running"
        self._lines = []
        self._subscribers = []
        self._lock = _threading.Lock()
        self._proc = None

    def set_proc(self, proc):
        with self._lock:
            self._proc = proc

    def abort(self):
        with self._lock:
            proc = self._proc
        if proc and proc.poll() is None:
            proc.terminate()

    def add_line(self, line):
        with self._lock:
            self._lines.append(line)
            for q in self._subscribers:
                q.put({"line": line})

    def finish(self, status):
        with self._lock:
            self.status = status
            self._proc = None
            for q in self._subscribers:
                q.put({"done": True, "status": status})
            self._subscribers.clear()

    def subscribe(self):
        q = _queue.Queue()
        with self._lock:
            for line in self._lines:
                q.put({"line": line})
            if self.status != "running":
                q.put({"done": True, "status": self.status})
            else:
                self._subscribers.append(q)
        return q

    def unsubscribe(self, q):
        with self._lock:
            try:
                self._subscribers.remove(q)
            except ValueError:
                pass


_tasks: dict[str, _Task] = {}
_tasks_lock = _threading.Lock()


@api_bp.route("/madgraph/status", methods=["GET"])
def madgraph_status():
    """Return whether a MadGraph executable was found."""
    path = current_app.config.get("MADGRAPH_PATH")
    return {"available": path is not None}, 200


@api_bp.route("/madgraph/generate", methods=["POST"])
def madgraph_generate():
    """Start a MadGraph generate+output run and return a task ID."""
    path = current_app.config.get("MADGRAPH_PATH")
    if not path:
        return {"error": "MadGraph executable not available"}, 503

    data = request.json or {}
    process_str = data.get("process", "").strip()
    name = data.get("name", "").strip()

    if not process_str or not name:
        return {"error": "process and name are required"}, 400

    task_id = str(_uuid.uuid4())
    task = _Task(task_id, name)
    with _tasks_lock:
        _tasks[task_id] = task

    stdin_input = f"generate {process_str}\noutput {name}\n"

    def _run():
        try:
            proc = _subprocess.Popen(
                [path],
                stdin=_subprocess.PIPE,
                stdout=_subprocess.PIPE,
                stderr=_subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            task.set_proc(proc)
            proc.stdin.write(stdin_input)
            proc.stdin.close()
            for line in proc.stdout:
                task.add_line(line.rstrip("\n"))
            proc.wait()
            task.finish(
                "done"
                if proc.returncode == 0
                else "aborted" if proc.returncode < 0 else "error"
            )
        except Exception as exc:
            task.add_line(f"[error] {exc}")
            task.finish("error")

    _threading.Thread(target=_run, daemon=True).start()

    return {"task_id": task_id, "name": name}, 200


@api_bp.route("/madgraph/tasks", methods=["GET"])
def list_tasks():
    """List all MadGraph tasks and their statuses."""
    with _tasks_lock:
        result = [
            {"id": t.id, "name": t.name, "status": t.status} for t in _tasks.values()
        ]
    return {"tasks": result}, 200


@api_bp.route("/madgraph/tasks/<task_id>/stream", methods=["GET"])
def stream_task(task_id):
    """SSE stream of output lines for a MadGraph task."""
    with _tasks_lock:
        task = _tasks.get(task_id)
    if task is None:
        return {"error": "Task not found"}, 404

    q = task.subscribe()

    def _generate():
        try:
            while True:
                try:
                    event = q.get(timeout=30)
                except _queue.Empty:
                    yield ": heartbeat\n\n"
                    continue
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("done"):
                    break
        finally:
            task.unsubscribe(q)

    resp = Response(
        stream_with_context(_generate()),
        content_type="text/event-stream",
    )
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


@api_bp.route("/madgraph/tasks/<task_id>/abort", methods=["POST"])
def abort_task(task_id):
    """Send SIGTERM to the subprocess backing a running task."""
    with _tasks_lock:
        task = _tasks.get(task_id)
    if task is None:
        return {"error": "Task not found"}, 404
    if task.status != "running":
        return {"error": "Task is not running"}, 409
    task.abort()
    return {"message": "Abort signal sent"}, 200


@api_bp.route("/processes/<process_name>/run", methods=["POST"])
def start_run(process_name):
    """Launch bin/generate_events -f inside the process directory."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404

    exe = os.path.join(process_dir, "bin", "generate_events")
    if not os.path.isfile(exe) or not os.access(exe, os.X_OK):
        return {"error": f"generate_events not found in {process_name}/bin/"}, 503

    task_id = str(_uuid.uuid4())
    task_name = f"{process_name} — run"
    task = _Task(task_id, task_name)
    with _tasks_lock:
        _tasks[task_id] = task

    abs_exe = os.path.abspath(exe)
    abs_cwd = os.path.abspath(process_dir)

    def _run():
        try:
            proc = _subprocess.Popen(
                [abs_exe, "-f"],
                stdout=_subprocess.PIPE,
                stderr=_subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=abs_cwd,
            )
            task.set_proc(proc)
            for line in proc.stdout:
                task.add_line(line.rstrip("\n"))
            proc.wait()
            task.finish(
                "done"
                if proc.returncode == 0
                else "aborted" if proc.returncode < 0 else "error"
            )
        except Exception as exc:
            task.add_line(f"[error] {exc}")
            task.finish("error")

    _threading.Thread(target=_run, daemon=True).start()
    return {"task_id": task_id, "name": task_name}, 200


@api_bp.route("/processes", methods=["GET"])
def get_processes():
    """Get list of processes with their runs."""
    processes = []
    for process_dir in os.scandir("."):
        if not process_dir.is_dir():
            continue
        if not os.path.isfile(os.path.join(process_dir.path, "Cards", "run_card.toml")):
            continue
        events_dir = os.path.join(process_dir.path, "Events")
        runs = (
            [f.name for f in os.scandir(events_dir) if f.is_dir()]
            if os.path.isdir(events_dir)
            else []
        )
        processes.append(
            {
                "name": process_dir.name,
                "runs": sorted(runs),
            }
        )
    return {"processes": processes}, 200


@api_bp.route("/processes/<process_name>", methods=["DELETE"])
def delete_process(process_name):
    """Delete a specific process."""
    if not process_name:
        return {"error": "Process name is required"}, 400
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    shutil.rmtree(process_dir)
    return {"message": "Process deleted successfully"}, 200


@api_bp.route("/processes/<process_name>/cards", methods=["GET"])
def get_cards(process_name):
    """Get list of cards for a specific process."""
    cards = []
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    cards_dir = os.path.join(process_dir, "Cards")
    if not os.path.isdir(cards_dir):
        return {"error": "Cards directory not found"}, 404
    for card_file in os.scandir(cards_dir):
        if card_file.is_file():
            cards.append(card_file.name)
    return {"cards": cards}, 200


@api_bp.route("/processes/<process_name>/cards/<card_name>", methods=["GET"])
def get_card(process_name, card_name):
    """Get a specific card for a process."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    cards_dir = os.path.join(process_dir, "Cards")
    if not os.path.isdir(cards_dir):
        return {"error": "Cards directory not found"}, 404
    card_path = os.path.join(cards_dir, card_name)
    if not os.path.isfile(card_path):
        return {"error": "Card not found"}, 404
    with open(card_path, "r") as f:
        content = f.read()
    return {"content": content}, 200


@api_bp.route("/processes/<process_name>/cards/<card_name>/download", methods=["GET"])
def download_card(process_name, card_name):
    """Download a specific card for a process."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    cards_dir = os.path.join(process_dir, "Cards")
    if not os.path.isdir(cards_dir):
        return {"error": "Cards directory not found"}, 404
    card_path = os.path.join(cards_dir, card_name)
    if not os.path.isfile(card_path):
        return {"error": "Card not found"}, 404
    return send_file(os.path.abspath(card_path), as_attachment=True)


@api_bp.route("/processes/<process_name>/cards/<card_name>", methods=["POST"])
def update_card(process_name, card_name):
    """Update a specific card for a process."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    cards_dir = os.path.join(process_dir, "Cards")
    if not os.path.isdir(cards_dir):
        return {"error": "Cards directory not found"}, 404
    card_path = os.path.join(cards_dir, card_name)
    if not os.path.isfile(card_path):
        return {"error": "Card not found"}, 404
    with open(card_path, "w") as f:
        f.write(request.json.get("content", ""))
    return {"message": "Card updated successfully"}, 200


@api_bp.route("/processes/<process_name>/runs", methods=["GET"])
def get_runs(process_name):
    """Get list of runs for a specific process."""
    runs = []
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    events_dir = os.path.join(process_dir, "Events")
    if not os.path.isdir(events_dir):
        return {"error": "Events directory not found"}, 404
    for run_dir in os.scandir(events_dir):
        if run_dir.is_dir():
            info_file = os.path.join(run_dir, "info.json")
            if os.path.isfile(info_file):
                with open(info_file, "r") as f:
                    info = json.load(f)
            else:
                info = {"status": "unknown"}
            files = [
                file_entry.name
                for file_entry in os.scandir(run_dir)
                if file_entry.is_file()
            ]
            runs.append(
                {
                    **info,
                    "name": run_dir.name,
                    "files": files,
                }
            )
    return {"runs": sorted(runs, key=lambda run: run["name"])}, 200


@api_bp.route("/processes/<process_name>/runs/<run_name>", methods=["DELETE"])
def delete_run(process_name, run_name):
    """Delete a specific run for a process."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    run_dir = os.path.join(process_dir, "Events", run_name)
    if not os.path.isdir(run_dir):
        return {"error": "Run not found"}, 404
    try:
        shutil.rmtree(run_dir)
        return {"message": "Run deleted successfully"}, 200
    except Exception as e:
        return {"error": str(e)}, 500


@api_bp.route("/processes/<process_name>/runs/<run_name>/info", methods=["GET"])
def get_run_info(process_name, run_name):
    """Get details of a specific run for a process."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    run_dir = os.path.join(process_dir, "Events", run_name)
    if not os.path.isdir(run_dir):
        return {"error": "Run not found"}, 404
    info_file = os.path.join(run_dir, "info.json")
    if not os.path.isfile(info_file):
        return {"status": "unknown"}, 200
    files = [
        file_entry.name for file_entry in os.scandir(run_dir) if file_entry.is_file()
    ]
    with open(info_file, "r") as f:
        info = json.load(f)
    return {**info, "files": files}, 200


@api_bp.route(
    "/processes/<process_name>/runs/<run_name>/download/<filename>", methods=["GET"]
)
def download_run_file(process_name, run_name, filename):
    """Download a specific file from a run."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    run_dir = os.path.join(process_dir, "Events", run_name)
    if not os.path.isdir(run_dir):
        return {"error": "Run not found"}, 404
    file_path = os.path.join(run_dir, filename)
    if not os.path.isfile(file_path):
        return {"error": "File not found"}, 404
    return send_file(os.path.abspath(file_path), as_attachment=True)


@api_bp.route("/processes/<process_name>/subprocesses", methods=["GET"])
def get_subprocesses(process_name):
    """List subprocesses that have diagrams.json."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    subprocesses_dir = os.path.join(process_dir, "SubProcesses")
    if not os.path.isdir(subprocesses_dir):
        return {"subprocesses": []}, 200
    names = []
    for entry in sorted(os.scandir(subprocesses_dir), key=lambda e: e.name):
        if entry.is_dir() and os.path.isfile(os.path.join(entry.path, "diagrams.json")):
            names.append(entry.name)
    return {"subprocesses": names}, 200


@api_bp.route(
    "/processes/<process_name>/subprocesses/<subproc_name>/diagrams", methods=["GET"]
)
def get_subprocess_diagrams(process_name, subproc_name):
    """Return diagrams.json for a subprocess."""
    process_dir = os.path.join(".", process_name)
    if not os.path.isdir(process_dir):
        return {"error": "Process not found"}, 404
    diagrams_path = os.path.join(
        process_dir, "SubProcesses", subproc_name, "diagrams.json"
    )
    if not os.path.isfile(diagrams_path):
        return {"error": "diagrams.json not found"}, 404
    with open(diagrams_path, "r") as f:
        diagrams = json.load(f)
    return {"diagrams": diagrams}, 200
