import { post } from './utils.js';

export async function requestRandomQuestion({ env = 'miner', lengths = [], types = ['traj', 'traj'] } = {}) {
    return post(
        '/random_question',
        JSON.stringify({
            env,
            lengths,
            types,
        }),
    ).then((resp) => resp.json());
}

export async function requestQuestionByName(name) {
    return post(
        '/named_question',
        JSON.stringify({
            name,
        }),
    ).then((resp) => resp.json());
}
