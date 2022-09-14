import { getAction, parseOpts } from './utils.js';

const keyState = new Set();

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
    div.appendChild(game.getCanvas());
    listenForKeys();

    game.render();

    setInterval(() => {
        if (!realtime && keyState.size === 0) return;

        const action = getAction(keyState);
        game.step(action);
        game.render();

        resetKeys();
    }, 1000 / 15);
}

main();
