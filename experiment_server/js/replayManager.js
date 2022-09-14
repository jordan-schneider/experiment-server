import AnswerManager from './answerManager.js';
import GameManager from './gameManager.js';
import QueryManager from './queryManager.js';
import Timer from './timer.js';

class ReplayManager {
    constructor(document, window, maxQuestions, tickLength, opts) {
        this.document = document;
        this.window = window;
        this.maxQuestions = maxQuestions;

        this.gamePromise = ReplayManager.constructGames(opts);

        this.gamePromise.then((games) => {
            this._games = games;
            this.addGamesToDocument(games);
        });

        this.queryManager = new QueryManager();
        this.timer = new Timer();
        this.gameManager = new GameManager(this.gamePromise, this.timer, tickLength);

        this.answerManager = new AnswerManager();
        this.question = null;

        // We need this await because this happens on page unload, and we need the answer submittion to block before
        // the page changes.
        // eslint-disable-next-line no-unused-vars
        this.window.addEventListener('visibilitychange', async (event) => {
            if (document.visibilityState === 'hidden') {
                await this.answerManager.submitAnswers();
            }
        });

        this.select = this.select.bind(this);
        this.selectLeft = this.selectLeft.bind(this);
        this.selectRight = this.selectRight.bind(this);
    }

    async getGames() {
        if (this._games === undefined) {
            await this.gamePromise;
        }
        return this._games;
    }

    static async constructGames(opts) {
        /* eslint-disable no-undef */
        return [
            await CheerpGame.init({
                ...CheerpGame.defaultOpts(),
                ...opts,
            }),
            await CheerpGame.init({
                ...CheerpGame.defaultOpts(),
                ...opts,
            }),
        ];
        /* eslint-enable no-undef */
    }

    addGamesToDocument(games) {
        this.document.getElementById('leftGame').appendChild(games[0].getCanvas());
        this.document.getElementById('rightGame').appendChild(games[1].getCanvas());
        return games;
    }

    async parseQuestion(question) {
        const leftTraj = question.trajs[0];
        const rightTraj = question.trajs[1];

        leftTraj.start_state = ReplayManager.prepareState(leftTraj.start_state);
        rightTraj.start_state = ReplayManager.prepareState(rightTraj.start_state);

        const trajs = [leftTraj, rightTraj];

        const games = await this.getGames();
        games[0].setState(leftTraj.start_state);
        games[0].render();
        games[1].setState(rightTraj.start_state);
        games[1].render();

        this.gameManager.setTrajs(trajs);
        return trajs;
    }

    static prepareState(state) {
        const newGrid = new Int32Array(state.grid.length);
        state.grid.forEach((value, key) => {
            newGrid[parseInt(key, 10)] = value;
        });

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

    async select(side) {
        this.timer.stop();

        if (!this.timer.started()) {
            return;
        }

        this.answerManager.addAnswer(side, this.timer);

        this.timer.reset();

        await this.leaveIfDone();

        this.nextQuestion();
    }

    async leaveIfDone() {
        if (this.queryManager.nQuestionsUsed() === this.maxQuestions) {
            await this.answerManager.submitAnswers();
            this.window.location.href = '/goodbye';
        }
    }

    async nextQuestion() {
        this.question = await this.parseQuestion(await this.queryManager.requestRandomQuestion());
        this.answerManager.setQuestionId(this.question.id);
    }

    async selectLeft() {
        this.select('left');
    }

    async selectRight() {
        this.select('right');
    }
}

export default ReplayManager;
