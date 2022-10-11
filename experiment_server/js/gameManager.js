class GameManager {
    constructor(gamePromise, timer, tickLength) {
        this.timer = timer;
        this.tickLength = tickLength;
        this.gamePromise = gamePromise.then((games) => {
            this._games = games;
            this._states = games.map((g) => ({
                game: g,
                traj: null,
                playState: 'paused',
                time: 0,
                maxTime: 0,
            }));
            setInterval(() => {
                this._states = this._states.map(GameManager.checkStep);
                this.setTimers();
            }, this.tickLength);
        });

        this.timers = [document.getElementById('leftTimer'), document.getElementById('rightTimer')];
        this.setTimers();

        this.pause = this.pause.bind(this);
        this.pauseLeft = this.pauseLeft.bind(this);
        this.pauseRight = this.pauseRight.bind(this);
        this.pauseBoth = this.pauseBoth.bind(this);
        this.play = this.play.bind(this);
        this.playLeft = this.playLeft.bind(this);
        this.playRight = this.playRight.bind(this);
        this.playBoth = this.playBoth.bind(this);
        this.restart = this.restart.bind(this);
        this.restartLeft = this.restartLeft.bind(this);
        this.restartRight = this.restartRight.bind(this);
        this.restartBoth = this.restartBoth.bind(this);
    }

    async getGames() {
        if (this._games === undefined) {
            await this.gamePromise;
        }
        return this._games;
    }

    async getGame(side) {
        return (await this.getGames())[GameManager.getSideIndex(side)];
    }

    async getGameStates() {
        if (this._states === undefined) {
            await this.gamePromise;
        }
        return this._states;
    }

    async getMaxSteps() {
        return (await this.getGameStates()).map((state) => state.maxTime);
    }

    async getGameState(side) {
        return (await this.getGameStates())[GameManager.getSideIndex(side)];
    }

    async setTimers() {
        const states = await this.getGameStates();
        const times = states.map((state) => state.time);
        if (!states.some((state) => state.traj === undefined || state.traj === null)) {
            const lengths = states.map((state) => state.traj.actions.length);
            this.timers.forEach((timer, i) => {
                timer.innerText = `${times[i]}/${lengths[i]}`;
            });
        }
    }

    async setGameState(side, gameState) {
        if (this._states === undefined) {
            await this.gamePromise;
        }
        this._states[GameManager.getSideIndex(side)] = gameState;
    }

    static checkStep(state) {
        const outState = { ...state };
        const { game } = state;
        if (state.playState !== 'paused') {
            const { time } = state;
            const { actions } = state.traj;
            if (time < actions.length) {
                const action = actions[time];
                game.step(action);
                game.render();
                outState.time += 1;
            }
            outState.maxTime = Math.max(outState.maxTime, outState.time);
        }
        return outState;
    }

    async setTrajs(trajs) {
        this._states = (await this.getGameStates()).map((state, i) => ({
            game: state.game,
            traj: trajs[i],
            playState: 'paused',
            time: 0,
            maxTime: 0,
        }));
    }

    static getSideIndex(side) {
        if (side === 'left') {
            return 0;
        }
        return 1;
    }

    async pause(side) {
        const state = await this.getGameState(side);
        state.playState = 'paused';
        this.setGameState(side, state);
    }

    async pauseLeft() {
        await this.pause('left');
    }

    async pauseRight() {
        await this.pause('right');
    }

    async pauseBoth() {
        await this.pause('left');
        await this.pause('right');
    }

    async play(side) {
        this.timer.start();
        const state = await this.getGameState(side);
        state.playState = 'playing';
        this.setGameState(side, state);
    }

    async playLeft() {
        await this.play('left');
    }

    async playRight() {
        await this.play('right');
    }

    async playBoth() {
        await this.play('left');
        await this.play('right');
    }

    async restart(side) {
        const state = await this.getGameState(side);
        state.time = 0;
        state.playState = 'paused';
        await this.setGameState(side, state);

        const game = await this.getGame(side);
        game.setState(state.traj.start_state);
        game.render();
    }

    async restartLeft() {
        await this.restart('left');
    }

    async restartRight() {
        await this.restart('right');
    }

    async restartBoth() {
        await this.restart('left');
        await this.restart('right');
    }
}

export default GameManager;
