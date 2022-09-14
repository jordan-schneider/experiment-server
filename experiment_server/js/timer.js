class Timer {
    constructor() {
        this.startTime = null;
        this.stopTime = null;
    }

    start() {
        if (!this.started()) {
            this.startTime = Date.now();
        }
    }

    started() {
        return this.startTime !== null;
    }

    stop() {
        if (!this.stopped() && this.started()) {
            this.stopTime = Date.now();
        }
    }

    stopped() {
        return this.stopTime !== null;
    }

    reset() {
        this.startTime = null;
        this.stopTime = null;
    }
}
export default Timer;
