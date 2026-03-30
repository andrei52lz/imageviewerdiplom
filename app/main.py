import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication, QMainWindow
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtCore import QUrl


DEV_MODE = True
DEV_URL = "http://localhost:5173/"


def get_frontend_url() -> QUrl:
    if DEV_MODE:
        return QUrl(DEV_URL)

    base_dir = Path(__file__).resolve().parent
    html_path = (base_dir.parent / "dist" / "index.html").resolve()
    return QUrl.fromLocalFile(str(html_path))


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("KITTI Viewer")
        self.resize(1400, 900)

        self.browser = QWebEngineView()
        self.browser.setUrl(get_frontend_url())

        self.setCentralWidget(self.browser)


def main():
    app = QApplication(sys.argv)

    window = MainWindow()
    window.showMaximized()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()