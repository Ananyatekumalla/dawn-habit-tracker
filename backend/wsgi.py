"""WSGI entry point for PythonAnywhere (or any WSGI host).

On PythonAnywhere, point the web app's WSGI file at this module (see DEPLOY.md).
Secrets such as API_TOKEN and CORS_ORIGINS go in backend/.env on the server.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app  # noqa: E402

application = create_app()
