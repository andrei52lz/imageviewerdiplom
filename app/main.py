import os
import sys
import threading
import time
import urllib.error
import urllib.request
import logging
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
LOG_DIR_NAME = "VisionKit"
LOG_FILE_NAME = "visionkit.log"


def resource_path(relative_path: str) -> Path:
    if getattr(sys, "frozen", False):
        base_dir = Path(getattr(sys, "_MEIPASS"))
    else:
        base_dir = PROJECT_ROOT

    return (base_dir / relative_path).resolve()


def get_log_file() -> Path:
    base_dir = os.getenv("LOCALAPPDATA")
    if base_dir:
        log_dir = Path(base_dir) / LOG_DIR_NAME / "logs"
    else:
        log_dir = PROJECT_ROOT / "logs"

    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / LOG_FILE_NAME


def configure_logging() -> Path:
    log_file = get_log_file()
    os.environ["VISIONKIT_LOG_FILE"] = str(log_file)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stderr),
        ],
        force=True,
    )
    return log_file


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
    logging.getLogger(__name__).info(
        "Starting VisionKit API on %s:%s with executable=%s frozen=%s",
        API_HOST,
        API_PORT,
        sys.executable,
        getattr(sys, "frozen", False),
    )
    uvicorn.run(
        fastapi_app,
        host=API_HOST,
        port=API_PORT,
        log_config=None,
        access_log=False,
    )


class ApiServerHandle:
    def __init__(self, server: uvicorn.Server, thread: threading.Thread):
        self.server = server
        self.thread = thread

    def stop(self) -> None:
        self.server.should_exit = True
        self.thread.join(timeout=5)


def start_embedded_api_server() -> Optional[ApiServerHandle]:
    logger = logging.getLogger(__name__)

    if is_api_available():
        logger.info("VisionKit API is already available at %s", API_URL)
        return None

    config = uvicorn.Config(
        fastapi_app,
        host=API_HOST,
        port=API_PORT,
        log_config=None,
        access_log=False,
    )
    server = uvicorn.Server(config)
    thread = threading.Thread(
        target=server.run,
        name="VisionKitApiServer",
        daemon=True,
    )
    thread.start()

    wait_for_api()
    if not is_api_available():
        logger.error("VisionKit API did not become available at %s", API_URL)
        raise RuntimeError(f"VisionKit API did not start. See log: {get_log_file()}")

    logger.info("VisionKit API started in embedded thread")
    return ApiServerHandle(server, thread)


def is_api_available() -> bool:
    try:
        with urllib.request.urlopen(f"{API_URL}/ping", timeout=1) as response:
            return response.status == 200 and b"VisionKit API" in response.read()
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def wait_for_api(timeout_seconds: float = 20.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if is_api_available():
            return
        time.sleep(0.2)


def main() -> None:
    log_file = configure_logging()
    logger = logging.getLogger(__name__)
    logger.info("VisionKit started. log_file=%s", log_file)

    if API_SERVER_ARG in sys.argv:
        run_api_server()
        return

    api_server = start_embedded_api_server()
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
        if api_server is not None:
            api_server.stop()
            logger.info("VisionKit API stopped")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
