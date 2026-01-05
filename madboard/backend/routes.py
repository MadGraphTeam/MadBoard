"""API routes for MadBoard backend."""

import json
import os
import shutil

from flask import Blueprint, request, send_file

api_bp = Blueprint("api", __name__)


@api_bp.route("/processes", methods=["GET"])
def get_processes():
    """Get list of processes with their runs."""
    processes = []
    for process_dir in os.scandir("."):
        if not process_dir.is_dir():
            continue
        subfolders = [f.name for f in os.scandir(process_dir) if f.is_dir()]
        if "Cards" not in subfolders or "Events" not in subfolders:
            continue
        runs = [
            f.name
            for f in os.scandir(os.path.join(process_dir, "Events"))
            if f.is_dir()
        ]

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
