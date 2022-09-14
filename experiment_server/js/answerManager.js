import { post } from './utils.js';

class AnswerManager {
    constructor() {
        this.answers = [];
        this.questionId = null;
    }

    setQuestionId(id) {
        if (this.questionId === null) {
            this.questionId = id;
        }
    }

    addAnswer(side, timer) {
        this.answers.push({
            id: this.questionId,
            answer: side,
            startTime: timer.startTime,
            stopTime: timer.stopTime,
        });
        this.questionId = null;
    }

    async submitAnswers() {
        if (this.answers.length > 0) {
            await post('/submit_answers', JSON.stringify(this.answers));
        }
        this.answers = [];
    }
}
export default AnswerManager;
