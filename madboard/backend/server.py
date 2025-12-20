"""Development server with automatic browser opening."""
import os
import webbrowser
from threading import Timer
from madboard.backend.app import create_app


def open_browser(port=5000):
    """Open the frontend in the browser after a short delay."""
    def _open():
        webbrowser.open(f'http://localhost:{port}')
    
    timer = Timer(1.0, _open)
    timer.daemon = True
    timer.start()


def run_server(port=5000, debug=True):
    """Run the Flask development server with browser opening."""
    app = create_app()
    
    # Open browser on startup
    open_browser(port)
    
    # Run the server
    app.run(
        host='127.0.0.1',
        port=port,
        debug=debug,
        use_reloader=debug
    )


if __name__ == '__main__':
    run_server()
