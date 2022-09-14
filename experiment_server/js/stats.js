class Stats {
    constructor(div, document, realtime) {
        this.document = document;

        this.stats = this.document.createElement('div');
        div.appendChild(this.stats);

        this.realtime = realtime;
        if (!realtime) {
            this.screens = this.document.createElement('div');
            div.appendChild(this.screens);

            this.screens.style.overflowX = 'auto';
            this.screens.style.whiteSpace = 'nowrap';
        }
    }

    print(state) {
        let rgb = null;
        if (!this.realtime) {
            rgb = state.rgb;
            this.screens.append(rgb);
        }
        let statsText = '';
        state.entries().foreach(([key, value]) => {
            if (String(key) !== 'rgb') {
                statsText += `${String(key)}: ${String(value)}\n`;
            }
        });
        return [statsText, rgb];
    }
}
export default Stats;
