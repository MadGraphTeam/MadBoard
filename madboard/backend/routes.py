"""API routes for MadBoard backend."""

import os

from flask import Blueprint

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
