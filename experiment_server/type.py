from __future__ import annotations

from typing import List, Literal, Optional, Tuple, cast

import numpy as np
from attrs import cmp_using, define, field

DataModality = Literal["state", "action", "traj"]
QuestionAlgorithm = Literal["random", "infogain", "manual"]


def assure_modality(modality: str) -> DataModality:
    if not (modality == "state" or modality == "action" or modality == "traj"):
        raise ValueError(f"Unknown modality: {modality}")
    modality = cast(DataModality, modality)
    return modality


@define(order=False)
class State:
    grid: np.ndarray = field(eq=cmp_using(eq=np.array_equal))
    grid_shape: Tuple[int, int]
    agent_pos: Tuple[int, int]
    exit_pos: Tuple[int, int]

    @staticmethod
    def from_json(json_dict: dict) -> State:
        grid = np.array(list(json_dict["grid"].values()))
        grid_shape = json_dict["grid_shape"]
        agent_pos = json_dict["agent_pos"]
        exit_pos = json_dict["exit_pos"]
        return State(grid, grid_shape, agent_pos, exit_pos)


@define(order=False, kw_only=True)
class Trajectory:
    start_state: State
    actions: Optional[np.ndarray] = field(eq=cmp_using(eq=np.array_equal))
    env_name: str
    modality: DataModality
    reason: Optional[str] = None


@define(order=False, kw_only=True)
class FeatureTrajectory(Trajectory):
    features: np.ndarray = field(eq=cmp_using(eq=np.array_equal))


@define
class Question:
    id: int
    trajs: Tuple[Trajectory, Trajectory]


@define
class Answer:
    question_id: int
    answer: bool
    start_time: str
    end_time: str
    max_steps: Tuple[int, int]


@define()
class User:
    user_id: int
    payment_code: str
    # [(quesiton_id, prefer_left)]
    responses: List[Answer]

    def get_used_questions(self) -> List[int]:
        return [r.question_id for r in self.responses]

    @staticmethod
    def from_dict(vals: dict) -> User:
        return User(
            user_id=vals["user_id"],
            payment_code=vals["payment_code"],
            responses=[Answer(**r) for r in vals["responses"]],
        )
