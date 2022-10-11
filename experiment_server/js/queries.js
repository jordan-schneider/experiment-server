import { post } from './utils.js';

export async function requestRandomQuestions({ env = 'miner', lengths = [], type = null } = {}) {
    return post(
        '/random_questions',
        JSON.stringify({
            env,
            lengths,
            type,
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
