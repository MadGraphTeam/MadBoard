"""Flask application factory with static file serving."""

import os

from flask import Flask, send_from_directory
from flask_cors import CORS


def create_app():
    """Create and configure the Flask application."""
    app = Flask(
        __name__, static_folder="../frontend/build/static", static_url_path="/static"
    )

    # Enable CORS for local development and production
    CORS(app)

    # Configuration
    app.config["DEBUG"] = os.getenv("FLASK_ENV", "development") == "development"

    # Register blueprints
    from madboard.backend.routes import api_bp

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.route("/health")
    def health():
        """Health check endpoint."""
        return {"status": "ok"}, 200

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        """Serve React app. For any route, serve index.html."""
        # If it's an API route, let Flask handle it
        if path.startswith("api/"):
            return {"error": "Not found"}, 404

        # Check if static file exists
        static_dir = os.path.join(os.path.dirname(__file__), "../frontend/build")
        if path and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)

        # Otherwise serve index.html for React routing
        return send_from_directory(static_dir, "index.html")

    return app
