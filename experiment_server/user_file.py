import json

import fs
import fs.base
from attrs import asdict

from experiment_server.type import User


class UserFile:
    def __init__(self, filesystem: fs.base.FS, user_id: int, payment_code: str):
        self.fs = filesystem
        self.user_id = user_id
        self.filename = f"user_{user_id}.json"

        self.create_file(payment_code)
        self.check_file(payment_code)

    def create_file(self, payment_code: str) -> None:
        if not self.fs.exists(self.filename):
            user = User(user_id=self.user_id, payment_code=payment_code, responses=[])
            with self.fs.open(self.filename, "w") as f:
                f.write(json.dumps(asdict(user)))

    def check_file(self, payment_code: str) -> None:
        user = self.get()
        if user.payment_code != payment_code:
            raise ValueError("Payment code mismatch")
        if user.user_id != self.user_id:
            raise ValueError("User ID mismatch")

    def get(self) -> User:
        with self.fs.open(self.filename, "r") as f:
            user = User.from_dict(json.loads(f.read()))
        return user

    def write(self, user: User) -> None:
        with self.fs.open(self.filename, "w") as f:
            f.write(json.dumps(asdict(user)))
