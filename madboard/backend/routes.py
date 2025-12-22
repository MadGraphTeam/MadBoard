"""API routes for MadBoard backend."""

import os

from flask import Blueprint, request

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
            runs.append(run_dir.name)
    return {"runs": sorted(runs)}, 200


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
        return {"error": "Info file not found"}, 404
    with open(info_file, "r") as f:
        info = f.read()
    return info, 200
