const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        interact: { import: './experiment_server/js/interact.js', filename: '[name].js' },
        record: { import: './experiment_server/js/record.js', filename: '[name].js' },
        replay: { import: './experiment_server/js/replay.js', filename: '[name].js' },
        yuri: { import: './experiment_server/js/yuri_demo.js', filename: '[name].js' },

    },
    output: {
        path: path.resolve(__dirname, 'experiment_server/static'),
    },
};
