import 'whatwg-fetch';

export function parseOpts(params) {
    try {
        const search = new URLSearchParams(params);
        const ret = {};
        // eslint-disable-next-line no-unused-vars
        search.forEach((value, key, parent) => {
            ret[key] = JSON.parse(value);
        });
        return ret;
    } catch (e) {
        console.error('Query string is invalid');
        return {};
    }
}

export function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function zip(a, b) {
    return a.map((k, i) => [k, b[i]]);
}

export function post(url, body) {
    return fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
        },
        body,
    });
}

export const combos = [
    ['ArrowLeft', 'ArrowDown'],
    ['ArrowLeft'],
    ['ArrowLeft', 'ArrowUp'],
    ['ArrowDown'],
    [],
    ['ArrowUp'],
    ['ArrowRight', 'ArrowDown'],
    ['ArrowRight'],
    ['ArrowRight', 'ArrowUp'],
    ['KeyD'],
    ['KeyA'],
    ['KeyW'],
    ['KeyS'],
    ['KeyQ'],
    ['KeyE'],
];

export function getAction(keyState) {
    let longest = -1;
    let action = -1;
    let i = 0;
    combos.forEach((combo) => {
        const hit = combo.every((key) => keyState.has(key));
        if (hit && longest < combo.length) {
            longest = combo.length;
            action = i;
        }
        i += 1;
    });
    return action;
}
