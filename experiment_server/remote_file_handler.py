from logging import FileHandler
from typing import Union

import fs


class RemoteFileHandler(FileHandler):
    def __init__(
        self,
        path: str,
        mode: str = "a",
        encoding=None,
        delay=False,
        localDir: str = "osfs:///tmp",
    ):
        self.filename = fs.path.basename(path)
        self.remoteDir = fs.path.dirname(path)
        self.localDir = localDir
        super().__init__(
            fs.open_fs(self.localDir).getsyspath(self.filename), mode, encoding, delay
        )
        self.pull()

    def pull(self):
        if fs.open_fs(self.remoteDir).exists(self.filename):
            fs.copy.copy_file_if_newer(
                fs.open_fs(self.remoteDir),
                self.filename,
                fs.open_fs(self.localDir),
                self.filename,
            )

    def push(self):
        fs.copy.copy_file_if_newer(
            fs.open_fs(self.localDir),
            self.filename,
            fs.open_fs(self.remoteDir),
            self.filename,
        )


def remoteFileHanlderFactory(
    path: str,
    mode: str = "a",
    encoding=None,
    delay=False,
    localDir: str = "osfs:///tmp",
) -> RemoteFileHandler:
    return RemoteFileHandler(path, mode, encoding, delay, localDir)
