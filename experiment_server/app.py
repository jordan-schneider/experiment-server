import logging
import os
from logging.config import dictConfig
from secrets import token_hex
from typing import Optional, Tuple

import arrow
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

from experiment_server.query import (
    create_user,
    get_named_question,
    get_payment_code,
    get_random_question,
    insert_answers,
    insert_question,
    insert_traj,
)
from experiment_server.serialize import serialize
from experiment_server.type import (
    Answer,
    Demographics,
    State,
    Trajectory,
    assure_modality,
)

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
            }
        },
        "root": {"level": "INFO", "handlers": ["wsgi"]},
    }
)

app = Flask(__name__, static_url_path="/assets")
app.secret_key = os.environ["SECRET_KEY"]


def get_db() -> RemoteSqlite:
    db = getattr(g, "_database", None)
    if db is None:
        if (db_path := os.environ.get("DATABASE_PATH")) is not None:
            logging.info("Using local database")
            db = RemoteSqlite(db_path)
        else:
            logging.info("Using s3 database")
            db = RemoteSqlite("s3://mrl-experiment-sqlite/experiments.db")
        g._database = db
    return db


def redirect_missing_session() -> Optional[Response]:
    if "user_id" not in session.keys():
        return redirect(url_for("welcome"))
    return None


# Pages


@app.route("/")
def welcome():
    payment_id = token_hex(16)
    db = get_db()
    db.pull(db.fspath)
    user_id = create_user(db.con, Demographics(), payment_id)
    db.push(db.fspath)
    session["user_id"] = user_id
    return render_template("welcome.html")


@app.route("/replay")
def replay():
    if (resp := redirect_missing_session()) is not None:
        return resp
    return render_template("replay.html")


@app.route("/goodbye")
def goodbye():
    if (resp := redirect_missing_session()) is not None:
        return resp
    user_id = session["user_id"]
    session.pop("user_id", None)
    return render_template(
        "goodbye.html", payment_code=get_payment_code(get_db().con, user_id)
    )


@app.route("/interact")
def interact():
    if (resp := redirect_missing_session()) is not None:
        return resp
    return render_template("interact.html")


@app.route("/record")
def record():
    return render_template("record.html")


# API


@app.route("/submit_answers", methods=["POST"])
def submit_answers():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    json = request.get_json()
    assert json is not None

    logging.debug(f"Received answers: {json}")

    answers = [
        Answer(
            user_id=0,
            question_id=j["id"],
            answer=j["answer"] == "right",
            start_time=arrow.get(j["startTime"]).isoformat(),
            end_time=arrow.get(j["stopTime"]).isoformat(),
        )
        for j in json
    ]

    db = get_db()
    db.pull(db.fspath)
    insert_answers(
        db.con,
        answers,
    )
    db.push(db.fspath)

    return jsonify({"success": True})


@app.route("/random_question", methods=["POST"])
def request_random_question():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405

    spec = request.get_json()
    assert spec is not None

    env = spec["env"]
    lengths = spec["lengths"]
    modality = spec["types"][0]
    exclude_ids = spec["exclude_ids"]

    if len(lengths) > 0:
        length = lengths[0]
    else:
        length = None

    try:
        modality = assure_modality(modality)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    question = get_random_question(
        get_db().con,
        question_type=modality,
        env=env,
        length=length,
        exclude_ids=exclude_ids,
    )
    return serialize(question)


@app.route("/named_question", methods=["POST"])
def request_named_question():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405

    spec = request.get_json()
    assert spec is not None

    question = get_named_question(conn=get_db().con, name=spec["name"])
    return serialize(question)


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


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.con.close()
