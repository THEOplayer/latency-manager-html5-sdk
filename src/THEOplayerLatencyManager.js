/**
 *      \\             A latency manager class
 *     <lo             which automatically attempts
 *      ll             to achieve the target
 *      llama~         latency when enabled.
 *      || ||
 *      '' ''
 */
window.THEOplayerLatencyManager = (function () {

    function retrieveServerTimeOffset() {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const timeOfRequest = performance.now();
            xhr.onload = () => {
                const timeOfResponse = performance.now();
                const serverDateTime = Date.parse(xhr.responseText);
                const timeOfServerSendingResponse = (timeOfResponse + timeOfRequest) / 2;
                const offset = serverDateTime - timeOfServerSendingResponse;
                resolve(offset);
            };
            xhr.open('GET', 'https://time.akamai.com/?iso&ms');
            xhr.send();
        });
    }

    const LATENCY_LOOP_INTERVAL = 500;
    const LATENCY_WINDOW = 0.1;
    const LATENCY_CATCHUP_RATE = 0.08;

    /**
     * A latency manager class which automatically attempts to achieve the target latency when enabled.
     */
    class THEOplayerLatencyManager {

        /**
         * Creates the latency manager
         * @param player {THEOplayer} A THEOplayer instance.
         * @param enabled {boolean} Optional flag to enable or disable the latency manager upon creation.
         * @param streamOffset {number} Optional offset for the stream timestamp in seconds.
         */
        constructor(player, enabled, streamOffset) {
            this._player = player;
            this._targetLatency = 3.5;
            this._streamTimeOffset = streamOffset || 0;
            this._serverTimeOffset = Date.now() - performance.now();
            this._intervalID = undefined;
            retrieveServerTimeOffset().then((serverTimeOffset) => {
                this._serverTimeOffset = serverTimeOffset;
                if (this.isEnabled) {
                    this._updateLatency();
                }
            });
            if (enabled) {
                this.enable();
            }
        }

        _updateLatency = () => {
            const player = this._player;
            if (player.paused) {
                return;
            }

            const currentLatency = this.currentLatency;
            const targetLatency = this.targetLatency;
            const shouldWeSpeedUp = targetLatency - LATENCY_WINDOW > currentLatency || targetLatency + LATENCY_WINDOW < currentLatency;
            const speedUpOrSlowDown = currentLatency > targetLatency;
            const playbackRateIsAlreadyChanged = speedUpOrSlowDown
                ? player.playbackRate === (1 + LATENCY_CATCHUP_RATE)
                : player.playbackRate === (1 - LATENCY_CATCHUP_RATE);

            if (shouldWeSpeedUp && !playbackRateIsAlreadyChanged) {
                player.playbackRate = speedUpOrSlowDown ? 1 + LATENCY_CATCHUP_RATE : 1 - LATENCY_CATCHUP_RATE;
            } else if (!shouldWeSpeedUp && playbackRateIsAlreadyChanged) {
                player.playbackRate = 1
            }
        }

        /**
         * Returns true if the manager is currently enabled.
         * @returns {boolean} Returns true if enabled.
         */
        get isEnabled() {
            return this._enabled;
        }

        /**
         * Enables the latency manager. This means every 500ms a sample of the latency will be calculated.
         * If the latency deviates from the configured target latency, the manager will attempt to reach said target latency.
         */
        enable() {
            this._enabled = true;
            this._intervalID = setInterval(this._updateLatency, LATENCY_LOOP_INTERVAL);
            this._updateLatency();
        }

        /**
         * Disables the latency manager.
         */
        disable() {
            this._enabled = false;
            if (this._intervalID) {
                clearInterval(this._intervalID);
            }
            this._player.playbackRate = 1;
        }

        /**
         * Returns the current absolute timestamp as retrieved from the local client. This timestamp will be synchronized with a remote time server to ensure NTP sync.
         * @returns {number} The current client timestamp in seconds.
         */
        get currentTimestamp() {
            const now = performance.now();
            return (now + this._serverTimeOffset) / 1000;
        }

        /**
         * Returns the current absolute timestamp as retrieved from the player, potentially offset by a provided offset configuration.
         * @returns {number} The current stream timestamp in seconds.
         */
        get currentMediaTimestamp() {
            return this._player.currentProgramDateTime.getTime() / 1000 + this._streamTimeOffset;
        }

        /**
         * Returns the current buffer as of `currentTime` until the end of the current player buffer.
         * @returns {number} The buffer in seconds.
         */
        get currentBuffer() {
            const player = this._player;
            const MARGIN = 0.04;
            const buffered = player.buffered;
            const currentTime = player.currentTime;

            let bufferUntil = currentTime;

            for (let index = 0, bufferedLength = buffered.length; index < bufferedLength; index += 1) {
                const start = buffered.start(index) - MARGIN;
                const end = buffered.end(index);

                if (end > currentTime) {
                    if (start <= bufferUntil) {
                        bufferUntil = end;
                    } else {
                        return 0;
                    }
                }
            }

            return bufferUntil - currentTime;
        }

        /**
         * Returns the current latency measured as the difference between the reported client timestamp and the media timestamp.
         * @returns {number} The current latency in seconds.
         */
        get currentLatency() {
            return this.currentTimestamp - this.currentMediaTimestamp;
        }

        /**
         * Returns the current latency target.
         * @returns {number} The latency target in seconds.
         */
        get targetLatency() {
            return this._targetLatency;
        }

        /**
         * Allows to configure the latency target. The provided target latency cannot be lower than 2 seconds.
         * @param target {number} The target latency in seconds.
         */
        set targetLatency(target) {
            this._targetLatency = Math.max(target || 0, 2);
        }
    }

    return THEOplayerLatencyManager;
})();