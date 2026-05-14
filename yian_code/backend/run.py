from __future__ import annotations

import sys


def main() -> int:
    try:
        import uvicorn
    except ImportError:
        print("Missing backend dependencies. Run: python -m pip install -r backend/requirements.txt")
        return 1

    uvicorn.run(
        "yian_backend.app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir="backend",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
