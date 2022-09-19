import { post } from './utils.js';
const broswerRegex = /(Chrome)|(Firefox)|(Edge)/;

// TODO: These versions are fake, figure out the real ones.
const minGoodVersions = {
    Chrome: 76,
    Firefox: 200,
    Edge: 18,
};
const goodVersionString = Object.entries(minGoodVersions)
    .map(([browser, version]) => {
        return `${browser} ${version}+`;
    })
    .join(', ');

function isGoodBrowser(userAgent) {
    const browserMatch = userAgent.match(broswerRegex);
    if (browserMatch) {
        const browser = browserMatch[0];
        // const versionRegex = new RegExp('([0-9]+])');
        const versionMatch = userAgent.match(new RegExp(browser + '/([0-9]+)'));
        if (versionMatch) {
            const version = versionMatch[1];
            if (browser in Object.keys(minGoodVersions)) {
                return version >= minGoodVersions[browser];
            }
        }
    }
    return false;
}

async function main() {
    const userAgent = navigator.userAgent;
    post('/log', JSON.stringify({ userAgent: userAgent }));
    if (!isGoodBrowser(userAgent)) {
        document
            .getElementById('browser-warning')
            .appendChild(document.createTextNode(`Your browser is not supported. Please use ${goodVersionString}.`));
        document.getElementById('content').hidden = true;
    }
}

main();
