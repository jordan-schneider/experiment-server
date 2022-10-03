import os
import re
from logging.config import dictConfig
from secrets import token_hex
from typing import Final, Literal, Optional, Tuple

import arrow
import fs
import numpy as np
from flask import (
    Flask,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from remote_sqlite import RemoteSqlite  # type: ignore
from werkzeug import Response

from experiment_server.encoder import Encoder
from experiment_server.query import (
    get_named_question,
    get_random_questions,
    insert_question,
    insert_traj,
)
from experiment_server.remote_file_handler import remoteFileHanlderFactory
from experiment_server.type import Answer, State, Trajectory, assure_modality
from experiment_server.user_file import UserFile

MAX_QUESTIONS: Final[int] = 20


def use_local() -> bool:
    return os.environ.get("EXPERIMENT_DIR") is not None


dictConfig(
    {
        "version": 1,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            }
        },
        "handlers": {
            "wsgi": {
                "class": "logging.StreamHandler",
                "stream": "ext://flask.logging.wsgi_errors_stream",
                "formatter": "default",
            },
            "file": {
                "()": remoteFileHanlderFactory,
                "path": "osfs://./experiment.log"
                if use_local()
                else "s3://mrl-experiment-sqlite/experiment.log",
                "formatter": "default",
            },
        },
        "root": {"level": "INFO", "handlers": ["wsgi", "file"]},
    }
)

app = Flask(__name__, static_url_path="/assets")
app.secret_key = os.environ["SECRET_KEY"]
app.json_encoder = Encoder  # type: ignore


def get_db() -> RemoteSqlite:
    db = getattr(g, "_database", None)
    if db is None:
        if (db_path := os.environ.get("DATABASE_PATH")) is not None:
            app.logger.info(f"Using local database at {db_path}")
            db = RemoteSqlite(db_path, always_download=True)
        else:
            app.logger.info("Using s3 database")
            db = RemoteSqlite(
                "s3://mrl-experiment-sqlite/experiments.db", always_download=True
            )
        g._database = db
    return db


def get_user_file() -> Optional[UserFile]:
    user_file = getattr(g, "_user_file", None)
    if (
        user_file is None
        and "user_id" in session.keys()
        and "payment_code" in session.keys()
    ):
        path = get_user_path()
        user_file = UserFile(path, session["user_id"], session["payment_code"])
        g._user_file = user_file
    return user_file


def redirect_missing_session(
    current_page: Literal["welcome", "instructions", "interact", "replay", "goodbye"]
) -> Optional[Response]:
    if (
        "user_id" not in session.keys() or not session["consent"]
    ) and current_page != "welcome":
        return redirect(url_for("welcome"))
    elif (user_file := get_user_file()) is not None:
        n_questions = len(user_file.get().get_used_questions())
        app.logger.info(f"current page: {current_page}, n_questions: {n_questions}")
        if n_questions > 0 and n_questions < MAX_QUESTIONS and current_page != "replay":
            return redirect(url_for("replay"))
        elif n_questions >= MAX_QUESTIONS and current_page != "goodbye":
            return redirect(url_for("goodbye"))
    return None


def get_user_path() -> str:
    return (
        "s3://mrl-experiment-sqlite/users/"
        if not use_local()
        else f"osfs://{os.environ['EXPERIMENT_DIR']}"
    )


def create_user() -> int:
    path = get_user_path()

    files = fs.open_fs(path).listdir("/")
    max_user_id = -1
    for f in files:
        if match := re.match(r"user_([0-9]+).json", f):
            max_user_id = max(max_user_id, int(match.group(1)))

    return max_user_id + 1


def parse_answer(json) -> Answer:
    return Answer(
        question_id=json["id"],
        answer=json["answer"] == "right",
        start_time=arrow.get(json["startTime"]).isoformat(),
        end_time=arrow.get(json["stopTime"]).isoformat(),
    )


# Pages


@app.route("/")
def welcome():
    if "consent" not in session.keys():
        session["consent"] = False
    if (resp := redirect_missing_session("welcome")) is not None:
        return resp
    if "user_id" not in session.keys():
        session["user_id"] = create_user()
        session["payment_code"] = token_hex(16)
    return render_template("welcome.html")


@app.route("/instructions")
def instructions():
    session["consent"] = True
    if (resp := redirect_missing_session("instructions")) is not None:
        return resp
    return render_template("instructions.html")


@app.route("/replay")
def replay():
    app.logger.info("Visited replay")
    if (resp := redirect_missing_session("replay")) is not None:
        return resp
    return render_template("replay.html")


@app.route("/goodbye")
def goodbye():
    app.logger.info("Visited goodbye")
    if (resp := redirect_missing_session("goodbye")) is not None:
        return resp
    return render_template("goodbye.html", payment_code=session["payment_code"])


@app.route("/interact")
def interact():
    if (resp := redirect_missing_session("interact")) is not None:
        return resp
    return render_template("interact.html")


@app.route("/record")
def record():
    return render_template("record.html")


# API


@app.route("/submit_answer", methods=["POST"])
def submit_answer():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    json = request.get_json()
    user_file = get_user_file()
    if user_file is None:
        return jsonify({"error": "User not found"}), 404
    user = user_file.get()
    user.responses.append(parse_answer(json))
    user_file.write(user)

    return jsonify({"success": True})


@app.route("/random_questions", methods=["POST"])
def request_random_questions():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    if (user_file := get_user_file()) is None:
        return jsonify({"error": "User not found"}), 404

    spec = request.get_json()
    assert spec is not None

    env = spec["env"]
    lengths = spec["lengths"]
    modality = spec["types"][0]
    exclude_ids = user_file.get().get_used_questions()

    if len(lengths) > 0:
        length = lengths[0]
    else:
        length = None

    questions = get_random_questions(
        conn=get_db().con,
        n_questions=MAX_QUESTIONS - len(exclude_ids),
        question_type=modality,
        env=env,
        length=length,
        exclude_ids=exclude_ids,
    )

    return jsonify(questions)


@app.route("/named_question", methods=["POST"])
def request_named_question():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405

    spec = request.get_json()
    assert spec is not None

    question = get_named_question(conn=get_db().con, name=spec["name"])
    return jsonify(question)


@app.route("/submit_question", methods=["POST"])
def submit_question():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    json = request.get_json()
    assert json is not None
    traj_ids: Tuple[int, int] = json["traj_ids"]
    label = json["name"]

    db = get_db()
    db.pull(db.fspath)
    id = insert_question(
        conn=db.con,
        traj_ids=traj_ids,
        algo="manual",
        env_name="miner",
        label=label,
    )
    db.push(db.fspath)
    return jsonify({"success": True, "question_id": id})


@app.route("/submit_trajectory", methods=["POST"])
def submit_trajectory():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    json = request.get_json()
    assert json is not None

    json_state = json["start_state"]

    db = get_db()
    db.pull(db.fspath)
    id = insert_traj(
        db.con,
        Trajectory(
            start_state=State.from_json(json_state),
            actions=np.array(json["actions"]),
            env_name="miner",
            modality="traj",
        ),
    )
    db.push(db.fspath)

    return jsonify({"success": True, "trajectory_id": id})


@app.route("/log", methods=["POST"])
def log():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    json = request.get_json()
    assert json is not None
    app.logger.info(json)
    return jsonify({"success": True})


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.con.close()
