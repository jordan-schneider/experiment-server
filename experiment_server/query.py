import logging
import pickle
import sqlite3
from typing import List, Optional, Sequence, Tuple

import numpy as np

from experiment_server.type import DataModality, Question, QuestionAlgorithm, Trajectory


def get_random_questions(
    conn: sqlite3.Connection,
    n_questions: int,
    question_type: DataModality,
    env: str,
    length: Optional[int] = None,
    exclude_ids: Optional[Sequence[int]] = None,
) -> List[Question]:
    if exclude_ids is None:
        exclude_ids = []
    excl_list = ", ".join(f":excl_{i}" for i in range(len(exclude_ids)))
    excl_values = {f"excl_{i}": id for i, id in enumerate(exclude_ids)}
    query_s = f"""
SELECT
    q.*,
    left.start_state AS left_start,
    left.actions AS left_actions,
    left.length AS left_length,
    left.modality AS left_modality,
    left.reason as left_reason,
    right.start_state AS right_start,
    right.actions AS right_actions,
    right.length AS right_length,
    right.modality AS right_modality,
    right.reason as right_reason
FROM 
    (SELECT * FROM questions {f"WHERE questions.id NOT IN ({excl_list})" if len(excl_list) > 0 else ""}) AS q
    LEFT JOIN trajectories AS left ON
        q.first_id=left.id
    LEFT JOIN trajectories AS right ON
        q.second_id=right.id
    WHERE
        {"left.length=:length AND right.length=:length AND" if length is not None else ""}
        {"left.modality=:question_type AND right.modality=:question_type AND" if question_type is not None else ""}
        q.env=:env
        AND left.env=:env
        AND right.env=:env 
    ORDER BY RANDOM() LIMIT :n_questions;"""
    values = {
        "question_type": question_type,
        "length": length,
        "env": env,
        "n_questions": n_questions,
        **excl_values,
    }
    logging.debug(f"Querying:\n{query_s}\nwith values:\n{values}")

    cursor = conn.execute(query_s, values)
    questions = []
    for (
        id,
        first_id,
        second_id,
        algorithm,
        env,
        question_name,
        left_start,
        left_actions,
        left_length,
        left_modality,
        left_reason,
        right_start,
        right_actions,
        right_length,
        right_modality,
        right_reason,
    ) in cursor:
        questions.append(
            Question(
                id=id,
                trajs=(
                    Trajectory(
                        start_state=pickle.loads(left_start),
                        actions=pickle.loads(left_actions),
                        env_name=env,
                        modality=left_modality,
                    ),
                    Trajectory(
                        start_state=pickle.loads(right_start),
                        actions=pickle.loads(right_actions),
                        env_name=env,
                        modality=right_modality,
                    ),
                ),
            )
        )
        if np.any(questions[-1].trajs[0].start_state.grid == 12) and np.any(
            questions[-1].trajs[1].start_state.grid == 12
        ):
            logging.warning(
                f"Both questions have a fire in them. Reasons: {left_reason}, {right_reason}"
            )
    assert len(questions) == n_questions
    return questions


def get_named_question(conn: sqlite3.Connection, name: str) -> Question:
    query_s = """
SELECT
    q.*,
    left.start_state AS left_start,
    left.actions AS left_actions,
    left.length AS left_length,
    left.modality AS left_modality,
    right.start_state AS right_start,
    right.actions AS right_actions,
    right.length AS right_length,
    right.modality AS right_modality
FROM 
    questions AS q
    LEFT JOIN trajectories AS left ON
        q.first_id=left.id
    LEFT JOIN trajectories AS right ON
        q.second_id=right.id
    WHERE
        q.label=:name
    ORDER BY RANDOM() LIMIT 1;"""
    values = {"name": name}
    logging.debug(f"Querying:\n{query_s}\nwith values:\n{values}")

    cursor = conn.execute(query_s, values)
    (
        id,
        first_id,
        second_id,
        algorithm,
        env,
        question_name,
        left_start,
        left_actions,
        left_length,
        left_modality,
        right_start,
        right_actions,
        right_length,
        right_modality,
    ) = next(cursor)
    return Question(
        id=id,
        trajs=(
            Trajectory(
                start_state=pickle.loads(left_start),
                actions=pickle.loads(left_actions),
                env_name=env,
                modality=left_modality,
            ),
            Trajectory(
                start_state=pickle.loads(right_start),
                actions=pickle.loads(right_actions),
                env_name=env,
                modality=right_modality,
            ),
        ),
    )


def insert_traj(conn: sqlite3.Connection, traj: Trajectory) -> int:
    # TODO: Swap pickle for dill
    cursor = conn.execute(
        "INSERT INTO trajectories (start_state, actions, length, env, modality, reason, cstates) VALUES (:start_state, :actions, :length, :env, :modality, :reason, :cstates)",
        {
            "start_state": pickle.dumps(traj.start_state),
            "actions": pickle.dumps(traj.actions),
            "length": len(traj.actions) if traj.actions is not None else 0,
            "env": traj.env_name,
            "modality": traj.modality,
            "reason": traj.reason,
            "cstates": pickle.dumps(traj.cstates),
        },
    )
    assert cursor.lastrowid is not None
    out = int(cursor.lastrowid)
    conn.commit()
    return out


def insert_question(
    conn: sqlite3.Connection,
    traj_ids: Tuple[int, int],
    algo: QuestionAlgorithm,
    env_name: str,
    label: Optional[str] = None,
) -> int:
    label_schema = ", label" if label is not None else ""
    label_value = ", :label" if label is not None else ""
    query = f"INSERT INTO questions (first_id, second_id, algorithm, env{label_schema}) VALUES (:first_id, :second_id, :algo, :env{label_value})"
    values = {
        "first_id": traj_ids[0],
        "second_id": traj_ids[1],
        "algo": algo,
        "env": env_name,
    }
    if label is not None:
        values["label"] = label
    logging.debug(f"query={query}, values={values}")
    cursor = conn.execute(query, values)
    assert cursor.lastrowid is not None
    out = int(cursor.lastrowid)
    conn.commit()
    return out


def save_questions(
    conn: sqlite3.Connection,
    questions: Sequence[Tuple[Trajectory, Trajectory]],
    algo: QuestionAlgorithm,
    env_name: str,
) -> None:
    for traj_1, traj_2 in questions:
        traj_1_id = insert_traj(conn, traj_1)
        traj_2_id = insert_traj(conn, traj_2)
        insert_question(conn, (traj_1_id, traj_2_id), algo, env_name)
    conn.commit()
