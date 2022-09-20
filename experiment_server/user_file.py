import json

import fs
from attrs import asdict

from experiment_server.type import User


class UserFile:
    def __init__(self, path: str, user_id: int, payment_code: str):
        self.dir = path
        self.user_id = user_id
        self.filename = f"user_{user_id}.json"

        self.create_file(payment_code)
        self.check_file(payment_code)

    def create_file(self, payment_code: str) -> None:
        if not fs.open_fs(self.dir).exists(self.filename):
            user = User(user_id=self.user_id, payment_code=payment_code, responses=[])
            with fs.open_fs(self.dir).open(self.filename, "w") as f:
                f.write(json.dumps(asdict(user)))

    def check_file(self, payment_code: str) -> None:
        user = self.get()
        if user.payment_code != payment_code:
            raise ValueError("Payment code mismatch")
        if user.user_id != self.user_id:
            raise ValueError("User ID mismatch")

    def get(self) -> User:
        with fs.open_fs(self.dir).open(self.filename, "r") as f:
            user = User.from_dict(json.loads(f.read()))
        return user

    def write(self, user: User) -> None:
        with fs.open_fs(self.dir).open(self.filename, "w") as f:
            f.write(json.dumps(asdict(user)))
