"""JSON error responses for the whole API."""

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class ValidationError(ValueError):
    """Raised when a request body or parameter is invalid."""


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ValidationError)
    def _validation(err: ValidationError):
        return jsonify(error="validation_error", message=str(err)), 400

    @app.errorhandler(HTTPException)
    def _http(err: HTTPException):
        return jsonify(error=err.name.lower().replace(" ", "_"), message=err.description), err.code

    @app.errorhandler(Exception)
    def _unexpected(err: Exception):
        app.logger.exception("Unhandled error: %s", err)
        return jsonify(error="server_error", message="Something went wrong on the server."), 500
