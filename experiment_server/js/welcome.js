import { post } from './utils.js';

const broswerRegex = /(Chrome)|(Firefox)|(Edge)|(Opera)|(Safari)/;

// TODO: These versions are fake, figure out the real ones.
const minGoodVersions = {
    Chrome: 0,
    Firefox: 61,
    Edge: 18,
    Opera: 13,
    Safari: 0,
};
const goodVersionString = Object.entries(minGoodVersions)
    .map(([browser, version]) => `${browser} ${version}+`)
    .join(', ');

function isGoodBrowser(userAgent) {
    const browserMatch = userAgent.match(broswerRegex);
    if (browserMatch) {
        const browser = browserMatch[0];
        // const versionRegex = new RegExp('([0-9]+])');
        const versionMatch = userAgent.match(new RegExp(`${browser}/([0-9]+)`));
        if (versionMatch) {
            const version = versionMatch[1];
            if (Object.keys(minGoodVersions).includes(browser)) {
                return version >= minGoodVersions[browser];
            }
        }
    }
    return false;
}

async function main() {
    const { userAgent } = navigator;
    post('/log', JSON.stringify({ userAgent }));
    if (!isGoodBrowser(userAgent)) {
        document
            .getElementById('browser-warning')
            .appendChild(document.createTextNode(`Your browser is not supported. Please use ${goodVersionString}.`));
        document.getElementById('content').hidden = true;
    }
}

main();
