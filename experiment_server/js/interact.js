import Timer from './timer.js';
import { getAction, parseOpts, post } from './utils.js';

const keyState = new Set();
const timer = new Timer();

function resetKeys() {
    keyState.clear();
}

function listenForKeys() {
    document.body.addEventListener('keydown', (e) => {
        keyState.add(e.code);
        e.preventDefault();
    });
}

async function main() {
    const div = document.getElementById('app');
    const button = document.getElementById('start');

    button.disabled = true;

    const opts = parseOpts();
    let realtime = false;
    if (opts.realtime !== undefined) {
        realtime = opts.realtime;
        delete opts.realtime;
    }

    // eslint-disable-next-line no-undef
    const game = await CheerpGame.init({
        ...CheerpGame.defaultOpts(), // eslint-disable-line no-undef
        ...opts,
    });
    div.removeChild(div.firstChild);
    div.appendChild(game.getCanvas());

    listenForKeys();

    game.render();

    timer.start();

    button.disabled = false;

    setInterval(() => {
        if (!realtime && keyState.size === 0) return;

        const action = getAction(keyState);
        game.step(action);
        game.render();

        resetKeys();
    }, 1000 / 15);
}

async function reportTime() {
    timer.stop();
    await post(
        '/interact_times',
        JSON.stringify({
            startTime: timer.startTime,
            stopTime: timer.stopTime,
        }),
    );
}

main();

window.reportTime = reportTime;
