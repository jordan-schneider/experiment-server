import { jest } from '@jest/globals';

jest.unstable_mockModule('./utils.js', () => ({ post: jest.fn() }));

const AnswerManager = (await import('./answerManager.js')).default;
const utils = await import('./utils.js');

test('setQuestionId', () => {
    const answerManager = new AnswerManager();
    answerManager.setQuestionId(1);
    expect(answerManager.questionId).toBe(1);
    answerManager.setQuestionId(2);
    expect(answerManager.questionId).toBe(1);
});

test('addAnswer', () => {
    const answerManager = new AnswerManager();

    const start = Date.now();
    const stop = start + 1000;

    answerManager.setQuestionId(1);
    answerManager.addAnswer('left', { startTime: start, stopTime: stop });
    expect(answerManager.answers).toStrictEqual([{ id: 1, answer: 'left', startTime: start, stopTime: stop }]);
    expect(answerManager.questionId).toBe(null);

    answerManager.setQuestionId(2);
    answerManager.addAnswer('right', { startTime: start + 2000, stopTime: stop + 2000 });
    expect(answerManager.answers).toStrictEqual([
        { id: 1, answer: 'left', startTime: start, stopTime: stop },
        { id: 2, answer: 'right', startTime: start + 2000, stopTime: stop + 2000 },
    ]);
    expect(answerManager.questionId).toBe(null);
});

test('submitAnswers', async () => {
    const answerManager = new AnswerManager();
    answerManager.setQuestionId(1);
    answerManager.addAnswer('left', { startTime: 1, stopTime: 2 });
    answerManager.setQuestionId(2);
    answerManager.addAnswer('right', { startTime: 3, stopTime: 4 });
    await answerManager.submitAnswers();
    expect(utils.post).toHaveBeenCalledWith(
        '/submit_answers',
        JSON.stringify([
            { id: 1, answer: 'left', startTime: 1, stopTime: 2 },
            { id: 2, answer: 'right', startTime: 3, stopTime: 4 },
        ]),
    );
    expect(answerManager.answers).toStrictEqual([]);
});
