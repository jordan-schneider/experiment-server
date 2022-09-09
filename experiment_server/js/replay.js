import 'core-js/actual/url-search-params';
import { post } from './utils.js';

const MAX_QUESTIONS = 20;

const games = [];
let gameStates = null;
let question = null;
const usedQuestions = [];
let startTime = null;
let stopTime = null;
let questionStarted = false;
let answers = [];

function parseOpts() {
  try {
    const search = new URLSearchParams(window.location.search);
    const ret = {};
    search.forEach((value, key, parent) => { ret[key] = JSON.parse(value); });
    return ret;
  } catch (e) {
    console.error('Query string is invalid');
    return {};
  }
}

async function requestRandomQuestion({
  env = 'miner', lengths = [], types = ['traj', 'traj'], excludeIds = [],
} = {}) {
  // TODO: I'm pretty sure things are getting wrapped twice, so I have to unwrap them twice here
  return post('/random_question', JSON.stringify({
    env,
    lengths,
    types,
    exclude_ids: excludeIds,
  })).then((resp) => resp.json()).then((json) => JSON.parse(json));
}

async function requestQuestionByName(name) {
  return post('/named_question', JSON.stringify({
    name,
  })).then((resp) => resp.json()).then((json) => JSON.parse(json));
}

function prepareState(state) {
  const newGrid = new Int32Array(state.grid.length);
  state.grid.forEach((value, key) => { newGrid[parseInt(key, 10)] = value; });

  const out = {
    grid: newGrid,
    grid_width: state.grid_shape[0],
    grid_height: state.grid_shape[1],
    agent_x: state.agent_pos[0],
    agent_y: state.agent_pos[1],
    exit_x: state.exit_pos[0],
    exit_y: state.exit_pos[1],
  };
  out.grid = newGrid;

  return out;
}

function makeGameState(game, traj) {
  return {
    game,
    traj,
    playState: 'paused',
    time: 0,
  };
}

async function parseQuestion() {
  const leftTraj = question.trajs[0];
  const rightTraj = question.trajs[1];
  leftTraj.start_state = prepareState(leftTraj.start_state);
  rightTraj.start_state = prepareState(rightTraj.start_state);

  games[0].setState(leftTraj.start_state);
  games[0].render();
  games[1].setState(rightTraj.start_state);
  games[1].render();

  gameStates = [makeGameState(games[0], leftTraj), makeGameState(games[1], rightTraj)];
}

function checkStep(state) {
  const outState = { ...state };
  const { game } = state;
  if (state.playState !== 'paused') {
    const { time } = state;
    const { actions } = state.traj;
    if (time < actions.length) {
      const leftAction = actions[time];
      game.step(leftAction);
      game.render();
      outState.time += 1;
    }
  }
  return outState;
}

async function setupGames(opts) {
  const leftGame = await CheerpGame.init({
    ...CheerpGame.defaultOpts(),
    ...opts,
  });
  const rightGame = await CheerpGame.init({
    ...CheerpGame.defaultOpts(),
    ...opts,
  });
  leftGame.getState();
  games.push(leftGame, rightGame);
  document.getElementById('leftGame').appendChild(leftGame.getCanvas());
  document.getElementById('rightGame').appendChild(rightGame.getCanvas());
}

async function submitAnswers() {
  if (answers.length > 0) {
    await post('/submit_answers', JSON.stringify(answers));
  }
  answers = [];
}

async function main() {
  const opts = parseOpts();

  const { questionName } = opts;
  delete opts.questionName;

  await setupGames(opts);

  if (questionName !== undefined) {
    question = await requestQuestionByName(questionName);
    await parseQuestion();
  } else {
    question = await requestRandomQuestion({ excludeIds: usedQuestions });
    await parseQuestion();
  }

  window.addEventListener('visibilitychange', async (event) => (document.visibilityState === 'hidden' ? submitAnswers() : null));

  setInterval(() => {
    gameStates[0] = checkStep(gameStates[0]);
    gameStates[1] = checkStep(gameStates[1]);
  }, 500);
}

function getSideIndex(side) {
  if (side === 'left') {
    return 0;
  }
  return 1;
}

function pause(side) {
  gameStates[getSideIndex(side)].playState = 'paused';
}
async function pauseLeft() {
  pause('left');
}
async function pauseRight() {
  pause('right');
}
async function pauseBoth() {
  pause('left');
  pause('right');
}

function play(side) {
  if (!questionStarted) {
    startTime = Date.now();
    questionStarted = true;
  }
  gameStates[getSideIndex(side)].playState = 'playing';
}
async function playLeft() {
  play('left');
}
async function playRight() {
  play('right');
}
async function playBoth() {
  play('left');
  play('right');
}

function restart(side) {
  const index = getSideIndex(side);
  gameStates[index].time = 0;
  gameStates[index].playState = 'paused';
  games[index].setState(gameStates[index].traj.start_state);
  games[index].render();
}
async function restartLeft() {
  restart('left');
}
async function restartRight() {
  restart('right');
}
async function restartBoth() {
  restart('left');
  restart('right');
}

async function select(side) {
  if (startTime === null) {
    return;
  }
  stopTime = Date.now();
  answers.push({
    id: question.id,
    answer: side,
    startTime,
    stopTime,
  });
  startTime = null;
  stopTime = null;
  questionStarted = false;
  usedQuestions.push(question.id);
  if (usedQuestions.length === MAX_QUESTIONS) {
    await submitAnswers();
    window.location.href = '/goodbye';
    return;
  }
  question = await requestRandomQuestion({ excludeIds: usedQuestions });
  await parseQuestion();
}
async function selectLeft() {
  select('left');
}
async function selectRight() {
  select('right');
}

window.pauseLeft = pauseLeft;
window.pauseRight = pauseRight;
window.pauseBoth = pauseBoth;
window.playLeft = playLeft;
window.playRight = playRight;
window.playBoth = playBoth;
window.restartLeft = restartLeft;
window.restartRight = restartRight;
window.restartBoth = restartBoth;
window.selectLeft = selectLeft;
window.selectRight = selectRight;

main();
