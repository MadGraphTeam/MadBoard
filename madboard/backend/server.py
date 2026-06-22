"""Server entry point using Waitress as WSGI server."""

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
    app = create_app()
    open_browser(port)
    serve(app, host="127.0.0.1", port=port)


if __name__ == "__main__":
    run_server()
