import { jest } from '@jest/globals';

const respValue = { id: 1, trajs: ['traj1', 'traj2'] };
const mockPost = jest.fn((url, data) =>
    Promise.resolve({
        json: () => Promise.resolve(respValue),
    }),
);
jest.unstable_mockModule('./utils.js', () => ({
    post: mockPost,
}));

const QueryManager = (await import('./queryManager.js')).default;

test('requestRandomQuestion', async () => {
    const qm = new QueryManager();
    const question = await qm.requestRandomQuestion();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0]).toBe('/random_question');
    expect(question).toEqual(respValue);
    expect(qm.usedQuestions).toEqual([1]);
    mockPost.mockClear();
});
test('requestQuestionByName', async () => {
    const qm = new QueryManager();
    const question = await qm.requestQuestionByName('question_name');
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0]).toBe('/named_question');
    expect(mockPost.mock.calls[0][1]).toBe(JSON.stringify({ name: 'question_name' }));
    expect(question).toEqual(respValue);
    expect(qm.usedQuestions).toEqual([1]);
    mockPost.mockClear();
});
