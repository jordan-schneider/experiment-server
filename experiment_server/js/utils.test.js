import { deepcopy } from './utils.js';

test('deepcopy copies primitive', () => {
    expect(deepcopy(3)).toBe(3);
});
test('deepcopy copy does not change when original does', () => {
    const a = { val: 1 };
    const b = deepcopy(a);
    a.val = 2;
    expect(b.val).toBe(1);
});
