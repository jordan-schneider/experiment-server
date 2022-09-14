import { jest } from '@jest/globals';
import GameManager from './gameManager';
import Timer from './timer';

jest.useFakeTimers();

test('constructor', () => {
    const games = ['game1', 'game2'];
    const gamePromise = Promise.resolve(games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    expect(gameManager.timer).toBe(timer);
    expect(gameManager.tickLength).toBe(period);
});

test('getGames', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    expect(gameManager._games).toBeUndefined();

    jest.runOnlyPendingTimers();

    expect(await gameManager.getGames()).toBe(games);
});

test('getGame', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = Promise.resolve(games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    expect(await gameManager.getGame('left')).toBe(games[0]);
    expect(await gameManager.getGame('right')).toBe(games[1]);
});

test('getGameStates', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = Promise.resolve(games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    expect(await gameManager.getGameStates()).toEqual([
        { game: 'game1', traj: null, playState: 'paused', time: 0 },
        { game: 'game2', traj: null, playState: 'paused', time: 0 },
    ]);
});

test('getGameState', async () => {
    const callback = jest.fn();
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
        callback();
        return games;
    });
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    expect(gameManager._states).toBeUndefined();

    const getStatePromise = gameManager.getGameState('left');

    expect(callback).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    await getStatePromise;
    expect(callback).toHaveBeenCalled();

    expect(await gameManager.getGameState('left')).toEqual({
        game: 'game1',
        traj: null,
        playState: 'paused',
        time: 0,
    });
    expect(await gameManager.getGameState('right')).toEqual({
        game: 'game2',
        traj: null,
        playState: 'paused',
        time: 0,
    });
});

test('setGameState', async () => {
    const callback = jest.fn();
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
        callback();
        return games;
    });
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    const newState = {
        game: games[0],
        traj: { actions: ['action1', 'action2'] },
        playState: 'paused',
        time: 100,
    };
    const setStatePromise = gameManager.setGameState('left', newState);

    expect(callback).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    await setStatePromise;
    expect(callback).toHaveBeenCalled();

    expect(gameManager._states).toStrictEqual([newState, { game: games[1], traj: null, playState: 'paused', time: 0 }]);
});

test('setTrajs', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    const traj1 = { actions: ['action1', 'action2'] };
    const traj2 = { actions: ['action3', 'action4'] };

    jest.runOnlyPendingTimers();

    await gameManager.setTrajs([traj1, traj2]);
    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: traj1, playState: 'paused', time: 0 },
        { game: games[1], traj: traj2, playState: 'paused', time: 0 },
    ]);
});

test('getSideIndex', () => {
    expect(GameManager.getSideIndex('left')).toBe(0);
    expect(GameManager.getSideIndex('right')).toBe(1);
});

test('testPause', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.runOnlyPendingTimers();

    gameManager.setGameState('left', {
        playState: 'test',
        ...(await gameManager.getGameState('left')),
    });

    await gameManager.pause('left');

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'paused', time: 0 },
        { game: games[1], traj: null, playState: 'paused', time: 0 },
    ]);
});

test('testPauseLeft', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.runOnlyPendingTimers();

    gameManager.setGameState('left', {
        playState: 'test',
        ...(await gameManager.getGameState('left')),
    });

    await gameManager.pauseLeft();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'paused', time: 0 },
        { game: games[1], traj: null, playState: 'paused', time: 0 },
    ]);
});

test('testPauseRight', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 100;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.runOnlyPendingTimers();

    gameManager.setGameState('right', {
        playState: 'test',
        ...(await gameManager.getGameState('right')),
    });

    await gameManager.pauseRight();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'paused', time: 0 },
        { game: games[1], traj: null, playState: 'paused', time: 0 },
    ]);
});

test('testPlay', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    await gameManager.play('left');

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'playing', time: 0 },
        { game: games[1], traj: null, playState: 'paused', time: 0 },
    ]);
});

test('testPlayLeft', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    await gameManager.playLeft();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'playing', time: 0 },
        { game: games[1], traj: null, playState: 'paused', time: 0 },
    ]);
});

test('testPlayRight', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    await gameManager.playRight();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'paused', time: 0 },
        { game: games[1], traj: null, playState: 'playing', time: 0 },
    ]);
});

test('testPlayBoth', async () => {
    const games = ['game1', 'game2'];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    await gameManager.playBoth();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: null, playState: 'playing', time: 0 },
        { game: games[1], traj: null, playState: 'playing', time: 0 },
    ]);
});

class GameMock {
    setState(state) {}
    render() {}
}

test('testRestart', async () => {
    const games = [new GameMock(), new GameMock()];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    const trajs = [
        { actions: ['action1', 'action2'], start_state: 'start1' },
        { actions: ['action3', 'action4'], start_state: 'start2' },
    ];
    await gameManager.setTrajs(trajs);

    gameManager.setGameState('left', {
        playState: 'test',
        ...(await gameManager.getGameState('left')),
    });

    await gameManager.restart('left');

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: trajs[0], playState: 'paused', time: 0 },
        { game: games[1], traj: trajs[1], playState: 'paused', time: 0 },
    ]);
});

test('testRestartLeft', async () => {
    const games = [new GameMock(), new GameMock()];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    const trajs = [
        { actions: ['action1', 'action2'], start_state: 'start1' },
        { actions: ['action3', 'action4'], start_state: 'start2' },
    ];
    await gameManager.setTrajs(trajs);

    await gameManager.setGameState('left', {
        playState: 'test',
        ...(await gameManager.getGameState('left')),
    });

    await gameManager.restartLeft();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: trajs[0], playState: 'paused', time: 0 },
        { game: games[1], traj: trajs[1], playState: 'paused', time: 0 },
    ]);
});

test('testRestartRight', async () => {
    const games = [new GameMock(), new GameMock()];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    const trajs = [
        { actions: ['action1', 'action2'], start_state: 'start1' },
        { actions: ['action3', 'action4'], start_state: 'start2' },
    ];
    await gameManager.setTrajs(trajs);

    gameManager.setGameState('right', {
        playState: 'test',
        ...(await gameManager.getGameState('right')),
    });

    await gameManager.restartRight();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: trajs[0], playState: 'paused', time: 0 },
        { game: games[1], traj: trajs[1], playState: 'paused', time: 0 },
    ]);
});

test('testRestartBoth', async () => {
    const games = [new GameMock(), new GameMock()];
    const gamePromise = new Promise((resolve) => setTimeout(resolve, 1000)).then(() => games);
    const timer = new Timer();
    const period = 10000;
    const gameManager = new GameManager(gamePromise, timer, period);

    jest.advanceTimersByTime(1001);

    const trajs = [
        { actions: ['action1', 'action2'], start_state: 'start1' },
        { actions: ['action3', 'action4'], start_state: 'start2' },
    ];
    await gameManager.setTrajs(trajs);

    gameManager.setGameState('left', {
        playState: 'test',
        ...(await gameManager.getGameState('left')),
    });
    gameManager.setGameState('right', {
        playState: 'test',
        ...(await gameManager.getGameState('right')),
    });

    await gameManager.restartBoth();

    expect(await gameManager.getGameStates()).toStrictEqual([
        { game: games[0], traj: trajs[0], playState: 'paused', time: 0 },
        { game: games[1], traj: trajs[1], playState: 'paused', time: 0 },
    ]);
});
