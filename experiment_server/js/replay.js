import ReplayManager from './replayManager.js';
import { parseOpts } from './utils.js';

let replayManager = null;

async function main() {
    const opts = parseOpts(window.location.search);

    const { questionName } = opts;
    delete opts.questionName;

    replayManager = new ReplayManager(document, window, 20, 500, opts);

    if (questionName !== undefined) {
        replayManager.parseQuestion(replayManager.queries.requestQuestionByName(questionName));
    } else {
        replayManager.nextQuestion();
    }
}

main();

window.pauseLeft = replayManager.gameManager.pauseLeft;
window.pauseRight = replayManager.gameManager.pauseRight;
window.pauseBoth = replayManager.gameManager.pauseBoth;
window.playLeft = replayManager.gameManager.playLeft;
window.playRight = replayManager.gameManager.playRight;
window.playBoth = replayManager.gameManager.playBoth;
window.restartLeft = replayManager.gameManager.restartLeft;
window.restartRight = replayManager.gameManager.restartRight;
window.restartBoth = replayManager.gameManager.restartBoth;
window.selectLeft = replayManager.selectLeft;
window.selectRight = replayManager.selectRight;
