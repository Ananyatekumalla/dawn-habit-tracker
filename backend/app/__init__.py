"""Application factory."""

import hmac

from flask import Flask, jsonify, request

from app.config import Config
from app.errors import register_error_handlers
from app.repositories.tracker_repository import TrackerRepository
from app.goals import load_goals
from app.routes.api import api
from app.services.targets import seed_targets


def create_app(config: Config | None = None) -> Flask:
    config = config or Config.from_env()
    app = Flask(__name__)
    app.config["DAWN"] = config
    app.json.sort_keys = False
    repo = TrackerRepository(config.database_path)
    app.extensions["tracker_repo"] = repo
    seed_targets(repo, load_goals(str(config.goals_path)))

    _register_cors(app, config)
    _register_auth(app, config)
    register_error_handlers(app)
    app.register_blueprint(api)
    return app


def _register_cors(app: Flask, config: Config) -> None:
    """Minimal CORS so the React dev server and Vercel can call the API."""

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin and origin in config.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, PUT, PATCH, DELETE, OPTIONS"
        return response


def _register_auth(app: Flask, config: Config) -> None:
    """Optional bearer token. Leave API_TOKEN empty for local development."""
    if not config.api_token:
        return

    @app.before_request
    def require_token():
        if request.method == "OPTIONS" or request.path == "/api/health":
            return None
        sent = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not hmac.compare_digest(sent, config.api_token):
            return jsonify(error="unauthorized", message="Missing or wrong API token."), 401
        return None
