#!/bin/bash
rm experiments.db
python ~/procgen-experiment/question-gen/question_gen/gen_questions.py init-db experiments.db schema.sql