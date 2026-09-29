import captureURL from "./voice-capture.worklet.js?url&no-inline";
import playbackURL from "./voice-playback.worklet.js?url&no-inline";

export function createRelayVoice({ send, onError }) {
  let context,
    input,
    capture,
    playback,
    silent,
    encoder,
    disposed = false,
    muted = false,
    deafened = false,
    sequence = 0,
    timestamp = 0;
  const epoch = crypto.getRandomValues(new Uint32Array(1))[0],
    peers = new Map();
  function remove(id) {
    const peer = peers.get(id);
    if (peer?.decoder.state !== "closed") peer?.decoder.close();
    peers.delete(id);
    playback?.port.postMessage({ remove: id });
  }
  return {
    async start(stream) {
      if (
        typeof AudioEncoder === "undefined" ||
        typeof AudioDecoder === "undefined"
      )
        throw Error("当前运行环境不支持语音，请使用新版桌面启动器");
      const config = {
        codec: "opus",
        sampleRate: 48000,
        numberOfChannels: 1,
        bitrate: 24000,
        opus: {
          format: "opus",
          frameDuration: 20000,
          application: "voip",
          complexity: 5,
          usedtx: true
        }
      };
      if (!(await AudioEncoder.isConfigSupported(config)).supported)
        throw Error("当前设备不支持语音编码");
      if (disposed) return;
      context = new AudioContext({
        sampleRate: 48000,
        latencyHint: "interactive"
      });
      await Promise.all([
        context.audioWorklet.addModule(captureURL),
        context.audioWorklet.addModule(playbackURL)
      ]);
      if (disposed) return;
      await context.resume();
      if (disposed) return;
      playback = new AudioWorkletNode(context, "hxz-voice-playback", {
        outputChannelCount: [1]
      });
      playback.connect(context.destination);
      encoder = new AudioEncoder({
        error: e => {
          if (!disposed) onError(e);
        },
        output: chunk => {
          if (disposed || muted || chunk.byteLength > 4000) return;
          const bytes = new Uint8Array(9 + chunk.byteLength),
            view = new DataView(bytes.buffer);
          bytes[0] = 1;
          view.setUint32(1, epoch);
          view.setUint32(5, sequence++);
          chunk.copyTo(bytes.subarray(9));
          send(bytes.buffer);
        }
      });
      encoder.configure(config);
      capture = new AudioWorkletNode(context, "hxz-voice-capture");
      capture.port.onmessage = ({ data }) => {
        capture.port.postMessage("consumed");
        if (
          disposed ||
          muted ||
          encoder.state !== "configured" ||
          encoder.encodeQueueSize > 5
        )
          return;
        const frame = new AudioData({
          format: "f32-planar",
          sampleRate: 48000,
          numberOfFrames: 960,
          numberOfChannels: 1,
          timestamp,
          data
        });
        timestamp += 20000;
        try {
          encoder.encode(frame);
        } finally {
          frame.close();
        }
      };
      silent = context.createGain();
      silent.gain.value = 0;
      input = context.createMediaStreamSource(stream);
      input.connect(capture);
      capture.connect(silent);
      silent.connect(context.destination);
    },
    receive(buffer, allowed) {
      if (
        disposed ||
        !playback ||
        deafened ||
        buffer.byteLength < 46 ||
        buffer.byteLength > 4045
      )
        return;
      const bytes = new Uint8Array(buffer);
      if (bytes[0] !== 1) return;
      const id = new TextDecoder().decode(bytes.subarray(1, 37));
      if (!allowed.includes(id)) return;
      const view = new DataView(buffer),
        receivedEpoch = view.getUint32(37),
        seq = view.getUint32(41);
      let peer = peers.get(id);
      if (peer && (peer.epoch !== receivedEpoch || seq > peer.seq + 25)) {
        remove(id);
        peer = null;
      }
      if (!peer) {
        if (peers.size >= 19) return;
        const decoder = new AudioDecoder({
          error: e => {
            remove(id);
            if (!disposed) onError(e);
          },
          output: frame => {
            try {
              if (disposed || deafened) return;
              const samples = new Float32Array(frame.numberOfFrames);
              frame.copyTo(samples, { planeIndex: 0, format: "f32-planar" });
              playback.port.postMessage({ id, samples }, [samples.buffer]);
            } finally {
              frame.close();
            }
          }
        });
        decoder.configure({
          codec: "opus",
          sampleRate: 48000,
          numberOfChannels: 1
        });
        peer = { decoder, epoch: receivedEpoch, seq: -1 };
        peers.set(id, peer);
      }
      if (seq <= peer.seq || peer.decoder.decodeQueueSize > 6) return;
      peer.seq = seq;
      try {
        peer.decoder.decode(
          new EncodedAudioChunk({
            type: "key",
            timestamp: seq * 20000,
            duration: 20000,
            data: bytes.subarray(45)
          })
        );
      } catch (e) {
        remove(id);
        onError(e);
      }
    },
    sync(ids) {
      for (const id of peers.keys()) if (!ids.includes(id)) remove(id);
    },
    mute(value) {
      muted = value;
    },
    deafen(value) {
      deafened = value;
      playback?.port.postMessage({ deafened: value });
      for (const id of peers.keys()) remove(id);
    },
    close() {
      disposed = true;
      if (capture) {
        capture.port.onmessage = null;
        capture.disconnect();
        capture.port.close();
      }
      input?.disconnect();
      silent?.disconnect();
      playback?.disconnect();
      playback?.port.close();
      if (encoder && encoder.state !== "closed") encoder.close();
      for (const id of peers.keys()) remove(id);
      if (context && context.state !== "closed")
        void context.close().catch(() => {});
    }
  };
}
