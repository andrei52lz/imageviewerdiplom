import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
import logging
import traceback
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from app.api import api as fastapi_app, set_app_exit_callback, set_directory_picker


DEV_URL = "http://127.0.0.1:5173/"
API_HOST = "127.0.0.1"
API_PORT = 8000
API_URL = f"http://{API_HOST}:{API_PORT}"
API_SERVER_ARG = "--api-server"
LOG_DIR_NAME = "VisionKit"
LOG_FILE_NAME = "visionkit.log"
QTWEBENGINE_FLAGS = (
    "--allow-file-access-from-files "
    "--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights"
)


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
    sys.excepthook = log_uncaught_exception
    return log_file


def configure_webengine() -> None:
    existing_flags = os.getenv("QTWEBENGINE_CHROMIUM_FLAGS", "").strip()
    if existing_flags:
        os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = f"{existing_flags} {QTWEBENGINE_FLAGS}"
    else:
        os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = QTWEBENGINE_FLAGS


def log_uncaught_exception(exc_type, exc_value, exc_traceback) -> None:
    logging.getLogger(__name__).critical(
        "Uncaught Python exception",
        exc_info=(exc_type, exc_value, exc_traceback),
    )


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

    return QUrl(f"{API_URL}/")


def run_api_server() -> None:
    logging.getLogger(__name__).info(
        "Starting VisionKit API on %s:%s with executable=%s frozen=%s",
        API_HOST,
        API_PORT,
        sys.executable,
        getattr(sys, "frozen", False),
    )
    try:
        uvicorn.run(
            fastapi_app,
            host=API_HOST,
            port=API_PORT,
            log_config=None,
            access_log=False,
        )
    except Exception:
        logging.getLogger(__name__).critical(
            "VisionKit API server failed to start\n%s",
            traceback.format_exc(),
        )
        raise


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

    if is_tcp_port_open(API_HOST, API_PORT):
        message = (
            f"Port {API_PORT} is already in use, but it is not responding as VisionKit API. "
            f"Close the process using {API_HOST}:{API_PORT} or change the API port."
        )
        logger.error(message)
        raise RuntimeError(message)

    config = uvicorn.Config(
        fastapi_app,
        host=API_HOST,
        port=API_PORT,
        log_config=None,
        access_log=False,
    )
    server = uvicorn.Server(config)
    def run_server() -> None:
        try:
            server.run()
        except Exception:
            logger.critical(
                "Embedded VisionKit API thread crashed\n%s",
                traceback.format_exc(),
            )
            raise

    thread = threading.Thread(
        target=run_server,
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


def is_tcp_port_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=1):
            return True
    except OSError:
        return False


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


def create_directory_picker_bridge():
    from PySide6.QtCore import QObject, Signal, Slot
    from PySide6.QtWidgets import QApplication, QFileDialog

    class DirectoryPickerBridge(QObject):
        request_directory = Signal(str, object)

        def __init__(self):
            super().__init__()
            self._dialog_lock = threading.Lock()
            self._parent_window = None
            self.request_directory.connect(self._open_directory_dialog)

        def set_parent_window(self, window) -> None:
            self._parent_window = window

        def pick_directory(self, title: str) -> Optional[Path]:
            with self._dialog_lock:
                payload = {
                    "event": threading.Event(),
                    "result": None,
                    "error": None,
                }

                self.request_directory.emit(title, payload)

                if not payload["event"].wait(timeout=300):
                    raise TimeoutError("Directory picker timed out")

                if payload["error"] is not None:
                    raise payload["error"]

                result = payload["result"]
                return Path(result) if result else None

        @Slot(str, object)
        def _open_directory_dialog(self, title: str, payload: dict) -> None:
            try:
                parent = self._parent_window or QApplication.activeWindow()
                if parent is not None:
                    parent.raise_()
                    parent.activateWindow()

                folder = QFileDialog.getExistingDirectory(
                    parent,
                    title,
                    "",
                    QFileDialog.Option.ShowDirsOnly,
                )
                payload["result"] = folder or None
            except Exception as exc:
                payload["error"] = exc
            finally:
                payload["event"].set()

    return DirectoryPickerBridge()


def create_app_exit_bridge(app):
    from PySide6.QtCore import QObject, Signal

    class AppExitBridge(QObject):
        request_exit = Signal()

        def __init__(self):
            super().__init__()
            self.request_exit.connect(app.quit)

        def exit_application(self) -> None:
            self.request_exit.emit()

    return AppExitBridge()


def main() -> None:
    configure_webengine()
    log_file = configure_logging()
    logger = logging.getLogger(__name__)
    logger.info("VisionKit started. log_file=%s", log_file)

    if API_SERVER_ARG in sys.argv:
        run_api_server()
        return

    from PySide6.QtGui import QIcon
    from PySide6.QtWebEngineWidgets import QWebEngineView
    from PySide6.QtWidgets import QApplication, QMainWindow, QMessageBox

    app = QApplication(sys.argv)
    directory_picker_bridge = create_directory_picker_bridge()
    app_exit_bridge = create_app_exit_bridge(app)
    set_directory_picker(directory_picker_bridge.pick_directory)
    set_app_exit_callback(app_exit_bridge.exit_application)

    try:
        api_server = start_embedded_api_server()
    except Exception as exc:
        logger.critical(
            "VisionKit backend startup failed\n%s",
            traceback.format_exc(),
        )
        QMessageBox.critical(
            None,
            "VisionKit backend error",
            (
                "Не удалось запустить Python API на http://127.0.0.1:8000.\n\n"
                f"{exc}\n\n"
                f"Лог: {log_file}"
            ),
        )
        sys.exit(1)

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

    icon_path = resource_path("public/icon.ico")
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    window = MainWindow()
    directory_picker_bridge.set_parent_window(window)
    window.showMaximized()

    try:
        exit_code = app.exec()
    finally:
        set_app_exit_callback(None)
        set_directory_picker(None)
        if api_server is not None:
            api_server.stop()
            logger.info("VisionKit API stopped")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
