# latency-manager-html5-sdk

The Latency Manager allows developers to configure a target latency for their low latency HLS or MPEG-DASH stream.
This Latency Manager can be used to decrease (or increase) the end-to-end latency, or to synchronize the latency across viewers.

## Usage

1. Add `THEOplayerLatencyManager.js` to your web project.
2. Initialize your latency manager, e.g. `const latencyManager = new THEOplayerLatencyManager(player, true, 0)`.
3. Set a target latency, e.g. `latencyManager.targetLatency = 4`.
4. Query the current latency through `latencyManager.currentLatency` and the current buffer through `latencyManager.currentBuffer`.

Am example usage is available at [`examples/example1.html`](examples/example1.html).

## License

The contents of this package are subject to the [THEOplayer license](https://www.theoplayer.com/terms).
