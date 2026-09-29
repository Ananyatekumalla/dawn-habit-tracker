"""Configuration read once from environment variables."""

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


def _load_dotenv(path: Path) -> None:
    """Tiny .env loader so we don't need an extra dependency."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


@dataclass(frozen=True)
class Config:
    database_path: Path
    goals_path: Path
    cors_origins: tuple[str, ...]
    api_token: str = ""
    testing: bool = False

    @classmethod
    def from_env(cls) -> "Config":
        _load_dotenv(BACKEND_DIR / ".env")
        db_path = Path(os.getenv("DATABASE_PATH", "instance/dawn.sqlite3"))
        if not db_path.is_absolute():
            db_path = BACKEND_DIR / db_path
        origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
        return cls(
            database_path=db_path,
            goals_path=Path(os.getenv("GOALS_PATH", PROJECT_DIR / "shared" / "goals.json")),
            cors_origins=tuple(o.strip() for o in origins.split(",") if o.strip()),
            api_token=os.getenv("API_TOKEN", ""),
        )
