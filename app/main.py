import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from app.api import api as fastapi_app


DEV_URL = "http://127.0.0.1:5173/"
API_HOST = "127.0.0.1"
API_PORT = 8000
API_URL = f"http://{API_HOST}:{API_PORT}"
API_SERVER_ARG = "--api-server"


def resource_path(relative_path: str) -> Path:
    if getattr(sys, "frozen", False):
        base_dir = Path(getattr(sys, "_MEIPASS"))
    else:
        base_dir = PROJECT_ROOT

    return (base_dir / relative_path).resolve()


def is_dev_mode() -> bool:
    return os.getenv("VISIONKIT_DEV", "").lower() in {"1", "true", "yes"}


def get_frontend_url():
    from PySide6.QtCore import QUrl

    if is_dev_mode():
        return QUrl(DEV_URL)

    html_path = resource_path("dist/index.html")
    if not html_path.exists():
        raise FileNotFoundError(
            "Frontend build not found. Run 'npm run build' before production desktop launch."
        )

    return QUrl.fromLocalFile(str(html_path))


def run_api_server() -> None:
    uvicorn.run(
        fastapi_app,
        host=API_HOST,
        port=API_PORT,
        log_config=None,
        access_log=False,
    )


def start_api_process() -> Optional[subprocess.Popen]:
    if is_api_available():
        return None

    if getattr(sys, "frozen", False):
        command = [sys.executable, API_SERVER_ARG]
    else:
        command = [sys.executable, str(Path(__file__).resolve()), API_SERVER_ARG]

    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    process = subprocess.Popen(command, creationflags=creation_flags)
    wait_for_api()
    return process


def is_api_available() -> bool:
    try:
        with urllib.request.urlopen(f"{API_URL}/ping", timeout=1):
            return True
    except (urllib.error.URLError, TimeoutError):
        return False


def wait_for_api(timeout_seconds: float = 8.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if is_api_available():
            return
        time.sleep(0.2)


def main() -> None:
    if API_SERVER_ARG in sys.argv:
        run_api_server()
        return

    api_process = start_api_process()
    from PySide6.QtGui import QIcon
    from PySide6.QtWebEngineWidgets import QWebEngineView
    from PySide6.QtWidgets import QApplication, QMainWindow

    class MainWindow(QMainWindow):
        def __init__(self):
            super().__init__()

            self.setWindowTitle("VisionKit")
            self.resize(1400, 900)

            icon_path = resource_path("public/icon.ico")
            if icon_path.exists():
                self.setWindowIcon(QIcon(str(icon_path)))

            self.browser = QWebEngineView()
            self.browser.setUrl(get_frontend_url())
            self.setCentralWidget(self.browser)

    app = QApplication(sys.argv)

    icon_path = resource_path("public/icon.ico")
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    window = MainWindow()
    window.showMaximized()

    try:
        exit_code = app.exec()
    finally:
        if api_process and api_process.poll() is None:
            api_process.terminate()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
