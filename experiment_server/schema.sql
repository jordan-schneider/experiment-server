CREATE TABLE IF NOT EXISTS trajectories(
  id INTEGER PRIMARY KEY,
  start_state BLOB NOT NULL,
  actions BLOB NOT NULL,
  length INT NOT NULL,
  env TEXT NOT NULL,
  modality TEXT NOT NULL,
  reason TEXT
);
CREATE TABLE IF NOT EXISTS questions(
  id INTEGER PRIMARY KEY,
  first_id INT NOT NULL,
  second_id INT NOT NULL,
  algorithm TEXT NOT NULL,
  env TEXT NOT NULL,
  label TEXT
);
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY,
  site_sequence INT NOT NULL,
  demographics BLOB NOT NULL,
  payment_code TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS answers(
  id INTEGER PRIMARY KEY,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  answer INT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);