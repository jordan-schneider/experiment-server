import logging
import os
from logging.config import dictConfig
from typing import Tuple

import arrow
import numpy as np
from flask import Flask, g, jsonify, render_template, request
from remote_sqlite import RemoteSqlite  # type: ignore

from experiment_server.query import (get_named_question, get_random_question,
                                     insert_answers, insert_question,
                                     insert_traj)
from experiment_server.serialize import serialize
from experiment_server.type import Answer, State, Trajectory, assure_modality

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
        db = RemoteSqlite("s3://mrl-experiment-sqlite/experiments.db")
        g._database = db
    return db


@app.route("/")
def index():
    return render_template("replay.html")


@app.route("/interact")
def interact():
    return render_template("interact.html")


@app.route("/record")
def record():
    return render_template("record.html")


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
    db.pull()
    insert_answers(
        db.con,
        answers,
    )
    db.push()

    return jsonify({"success": True})


@app.route("/random_question", methods=["POST"])
def request_random_question():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405

    spec = request.get_json()
    assert spec is not None

    env = spec["env"]
    length = spec["lengths"][0]
    modality = spec["types"][0]
    exclude_ids = spec["exclude_ids"]

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
    db.pull()
    id = insert_question(
        conn=db.con,
        traj_ids=traj_ids,
        algo="manual",
        env_name="miner",
        label=label,
    )
    db.push()
    return jsonify({"success": True, "question_id": id})


@app.route("/submit_trajectory", methods=["POST"])
def submit_trajectory():
    if request.method != "POST":
        return jsonify({"error": "Method not allowed"}), 405
    json = request.get_json()
    assert json is not None

    json_state = json["start_state"]

    db = get_db()
    db.pull()
    id = insert_traj(
        db.con,
        Trajectory(
            start_state=State.from_json(json_state),
            actions=np.array(json["actions"]),
            env_name="miner",
            modality="traj",
        ),
    )
    db.push()

    return jsonify({"success": True, "trajectory_id": id})


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.con.close()
