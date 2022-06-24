#!/bin/bash
rm experiments.db
python ~/web-procgen/quesiton-gen/question_gen/gen_questions.py init-db experiments.db schema.sql
python ~/web-procgen/quesiton-gen/question_gen/gen_questions.py gen-random-questions experiments.db miner 10 traj