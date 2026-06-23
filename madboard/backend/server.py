"""Server entry point using Waitress as WSGI server."""

import argparse
import os
import webbrowser
from threading import Timer

from waitress import serve

from madboard.backend.app import create_app


def open_browser(port=5000):
    def _open():
        webbrowser.open(f"http://127.0.0.1:{port}")

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

    url = f"http://127.0.0.1:{args.port}"
    print(f"Starting MadBoard at {url}")

    app = create_app(madgraph_path=madgraph_path)
    open_browser(args.port)
    serve(app, host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    run_server()
