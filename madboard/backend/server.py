"""Server entry point using Waitress as WSGI server."""

import argparse
import os
import secrets
import socket
import webbrowser
from threading import Timer

from waitress import serve

from madboard.backend.app import create_app

HOST = "127.0.0.1"


def find_free_port(start_port, host=HOST, max_tries=100):
    """Return the first free port at or after start_port."""
    port = start_port
    for _ in range(max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return port
            except OSError:
                port += 1
    raise RuntimeError(f"Could not find a free port in range {start_port}-{port - 1}")


def open_browser(url):
    def _open():
        webbrowser.open(url)

    timer = Timer(1.0, _open)
    timer.daemon = True
    timer.start()


def run_server(port=5000):
    parser = argparse.ArgumentParser(description="MadBoard server")
    parser.add_argument("--port", type=int, default=port, help="Port to listen on")
    parser.add_argument(
        "--madgraph",
        type=str,
        default="bin/mg5_aMC",
        help="Path to MadGraph executable (default: bin/mg5_aMC)",
    )
    args = parser.parse_args()

    madgraph_path = args.madgraph
    if os.path.isfile(madgraph_path) and os.access(madgraph_path, os.X_OK):
        print(f"MadGraph executable found: {madgraph_path}")
    else:
        print(
            f"MadGraph executable not found at '{madgraph_path}'. "
            "Process generation will be unavailable.\n"
            f"  Hint: use --madgraph=<path> to specify the mg5_aMC executable."
        )
        madgraph_path = None

    port = find_free_port(args.port)
    if port != args.port:
        print(f"Port {args.port} is already in use, using port {port} instead.")

    token = secrets.token_urlsafe(32)
    url = f"http://{HOST}:{port}/?token={token}"
    print(f"Starting MadBoard at {url}")

    app = create_app(madgraph_path=madgraph_path, token=token)
    open_browser(url)
    serve(app, host=HOST, port=port)


if __name__ == "__main__":
    run_server()
