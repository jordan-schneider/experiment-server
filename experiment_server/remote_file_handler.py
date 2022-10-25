from logging import FileHandler

import fs
import fs.base
import fs.copy


class RemoteFileHandler(FileHandler):
    def __init__(
        self,
        filesystem: fs.base.FS,
        filename: str,
        mode: str = "a",
        encoding=None,
        delay=False,
        localDir: str = "osfs:///tmp",
    ):
        self.filename = filename
        self.remote_fs = filesystem
        self.localDir = localDir
        self.local_fs = fs.open_fs(self.localDir)
        super().__init__(
            fs.open_fs(self.localDir).getsyspath(self.filename), mode, encoding, delay
        )
        self.pull()

    def pull(self):
        if self.remote_fs.exists(self.filename):
            fs.copy.copy_file_if_newer(
                self.remote_fs,
                self.filename,
                self.local_fs,
                self.filename,
            )

    def push(self):
        fs.copy.copy_file_if_newer(
            self.local_fs,
            self.filename,
            self.remote_fs,
            self.filename,
        )


def remoteFileHanlderFactory(
    filesystem: fs.base.FS,
    filename: str,
    mode: str = "a",
    encoding=None,
    delay=False,
    localDir: str = "osfs:///tmp",
) -> RemoteFileHandler:
    return RemoteFileHandler(filesystem, filename, mode, encoding, delay, localDir)
