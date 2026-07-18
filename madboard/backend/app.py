"""Flask application factory with static file serving."""

import hmac
import os

from flask import Flask, g, request, send_from_directory
from flask_cors import CORS

TOKEN_COOKIE = "madboard_token"
TOKEN_PARAM = "token"


def create_app(madgraph_path=None, token=None):
    """Create and configure the Flask application."""
    app = Flask(
        __name__, static_folder="../frontend/build/static", static_url_path="/static"
    )

    # Enable CORS for local development and production
    CORS(app)

    # Configuration
    app.config["DEBUG"] = os.getenv("FLASK_ENV", "development") == "development"
    app.config["MADGRAPH_PATH"] = madgraph_path
    app.config["AUTH_TOKEN"] = token

    # Register blueprints
    from madboard.backend.routes import api_bp

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.before_request
    def _require_token():
        """Block access unless the request carries the launch token.

        Binding to 127.0.0.1 only limits access to the local machine — it
        does not stop other users on a shared system from connecting. The
        token (delivered via the URL printed/opened at launch) is what
        actually restricts access to whoever started the server.
        """
        expected = app.config.get("AUTH_TOKEN")
        if expected is None:
            return None

        cookie_token = request.cookies.get(TOKEN_COOKIE)
        if cookie_token and hmac.compare_digest(cookie_token, expected):
            return None

        query_token = request.args.get(TOKEN_PARAM)
        if query_token and hmac.compare_digest(query_token, expected):
            g.set_token_cookie = True
            return None

        return {"error": "Unauthorized"}, 401

    @app.after_request
    def _set_token_cookie(response):
        if getattr(g, "set_token_cookie", False):
            response.set_cookie(
                TOKEN_COOKIE,
                app.config["AUTH_TOKEN"],
                httponly=True,
                samesite="Lax",
            )
        return response

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
