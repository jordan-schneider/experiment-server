import { post } from './utils.js';

class QueryManager {
    constructor() {
        this.usedQuestions = [];
    }

    async requestRandomQuestion({ env = 'miner', lengths = [], types = ['traj', 'traj'] } = {}) {
        const out = await post(
            '/random_question',
            JSON.stringify({
                env,
                lengths,
                types,
                exclude_ids: this.usedQuestions,
            }),
        ).then((resp) => resp.json());
        this.usedQuestions.push(out.id);
        return out;
    }

    async requestQuestionByName(name) {
        const out = await post(
            '/named_question',
            JSON.stringify({
                name,
            }),
        ).then((resp) => resp.json());
        this.usedQuestions.push(out.id);
        return out;
    }

    nQuestionsUsed() {
        return this.usedQuestions.length;
    }
}
export default QueryManager;
