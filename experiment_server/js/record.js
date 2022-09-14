import 'core-js/actual/promise/index.js';
import { getAction, parseOpts, post } from './utils.js';

class Recorder {
    constructor() {
        this.recording = false;
        this.firstTraj = null;
        this.secondTraj = null;
        this.startState = null;
        this.actions = null;
    }

    startRecording(startState) {
        if (this.recording) {
            throw new Error('Already recording');
        }
        if (this.firstTraj !== null && this.secondTraj !== null) {
            throw new Error('Already recorded two trajectories, submit a question before recording a new one');
        }
        this.recording = true;
        this.startState = startState;
        this.actions = [];
    }

    stopRecording() {
        this.recording = false;
        if (this.firstTraj === null) {
            this.firstTraj = {
                actions: this.actions,
                startState: this.startState,
            };
        } else if (this.secondTraj === null) {
            this.secondTraj = {
                actions: this.actions,
                startState: this.startState,
            };
        } else {
            throw new Error('Too many trajectories');
        }
        this.actions = null;
        this.startState = null;
    }

    cancelRecording() {
        this.recording = false;
        this.startState = null;
        this.actions = null;
    }

    async submitQuestion(name) {
        if (this.firstTraj === null || this.secondTraj === null) {
            throw new Error('Need finished trajectories to submit.');
        }

        let trajIds = [
            post(
                '/submit_trajectory',
                JSON.stringify({
                    start_state: this.firstTraj.startState,
                    actions: this.firstTraj.actions,
                }),
            ),
            post(
                '/submit_trajectory',
                JSON.stringify({
                    start_state: this.secondTraj.startState,
                    actions: this.secondTraj.actions,
                }),
            ),
        ];
        trajIds = await Promise.all(
            trajIds.map((trajId) => trajId.then((resp) => resp.json()).then((json) => json.trajectory_id)),
        );
        post(
            '/submit_question',
            JSON.stringify({
                traj_ids: trajIds,
                name,
            }),
        );
    }

    resetQuestion() {
        this.firstTraj = null;
        this.secondTraj = null;
        this.cancelRecording();
    }
}

let game = null;
let focus = false;
const recorder = new Recorder();
const keyState = new Set();

function resetKeys() {
    keyState.clear();
}

function listenForKeys() {
    document.body.addEventListener('keydown', (e) => {
        if (focus) {
            keyState.add(e.code);
            e.preventDefault();
        }
    });
}

async function main() {
    const div = document.getElementById('app');
    const opts = parseOpts();
    let realtime = false;
    if (opts.realtime !== undefined) {
        realtime = opts.realtime;
        delete opts.realtime;
    }

    // eslint-disable-next-line no-undef
    game = await CheerpGame.init({
        ...CheerpGame.defaultOpts(), // eslint-disable-line no-undef
        ...opts,
    });
    div.appendChild(game.getCanvas());
    listenForKeys();

    game.render();

    setInterval(() => {
        if (!realtime && keyState.size === 0) return;

        const action = getAction(keyState);
        if (recorder.recording && action >= 0) {
            recorder.actions.push(action);
        }

        game.step(action);
        game.render();

        resetKeys();
    }, 1000 / 15);
}

async function startRecording() {
    recorder.startRecording(jsStateToPython(game.getState()));
}

function jsStateToPython(state) {
    return {
        grid: state.grid,
        grid_shape: [state.grid_width, state.grid_height],
        agent_pos: [state.agent_x, state.agent_y],
        exit_pos: [state.exit_x, state.exit_y],
    };
}

async function submitRecording() {
    if (!recorder.recording || recorder.startState === null || recorder.actions === null) {
        return;
    }
    recorder.stopRecording();
    document.getElementById('firstTraj').checked = true;
    if (recorder.secondTraj !== null) {
        document.getElementById('secondTraj').checked = true;
    }
}

async function cancelRecording() {
    recorder.cancelRecording();
}

async function resetQuestion() {
    recorder.resetQuestion();
    document.getElementById('firstTraj').checked = false;
    document.getElementById('secondTraj').checked = false;
    document.getElementById('questionName').value = '';
}

async function submitQuestion() {
    const name = document.getElementById('questionName').value;
    await recorder.submitQuestion(name);
    resetQuestion();
}

async function clearQuestion() {
    resetQuestion();
}

async function gameFocus() {
    focus = true;
}
async function gameUnfocus() {
    focus = false;
}

window.gameFocus = gameFocus;
window.gameUnfocus = gameUnfocus;
window.startRecording = startRecording;
window.submitRecording = submitRecording;
window.cancelRecording = cancelRecording;
window.clearQuestion = clearQuestion;
window.submitQuestion = submitQuestion;

main();
