import { post } from './utils.js';

class QueryManager {
    constructor() {
        this.usedQuestions = [];
    }

    async requestRandomQuestion({ env = 'miner', lengths = [], types = ['traj', 'traj'] } = {}) {
        // TODO: I'm pretty sure things are getting wrapped twice, so I have to unwrap them twice here
        const out = await post(
            '/random_question',
            JSON.stringify({
                env,
                lengths,
                types,
                exclude_ids: this.usedQuestions,
            }),
        )
            .then((resp) => resp.json())
            .then((json) => JSON.parse(json));
        this.usedQuestions.push(out.id);
        return out;
    }

    static async requestQuestionByName(name) {
        return post(
            '/named_question',
            JSON.stringify({
                name,
            }),
        )
            .then((resp) => resp.json())
            .then((json) => JSON.parse(json));
    }

    nQuestionsUsed() {
        return this.usedQuestions.length;
    }
}
export default QueryManager;
