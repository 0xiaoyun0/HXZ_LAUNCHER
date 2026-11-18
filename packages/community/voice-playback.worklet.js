class VoicePlayback extends AudioWorkletProcessor {
  constructor() {
    super();
    this.peers = new Map();
    this.deafened = false;
    this.port.onmessage = ({ data }) => {
      if (data.remove) {
        this.peers.delete(data.remove);
        return;
      }
      if (data.deafened !== undefined) {
        this.deafened = data.deafened;
        this.peers.clear();
        return;
      }
      if (this.deafened) return;
      let p = this.peers.get(data.id);
      if (!p) {
        if (this.peers.size >= 49) return;
        p = { queue: [], offset: 0, playing: false, last:0 };
        this.peers.set(data.id, p);
      }
      if (p.queue.length >= 12) {
        p.queue = p.queue.slice(-3);
        p.offset = 0;
        p.playing = false;
      }
      p.queue.push(data.samples);
    };
  }
  process(_inputs, outputs) {
    const output = outputs[0][0];
    for (const p of this.peers.values()) {
      if (!p.playing && p.queue.length < 3) continue;
      p.playing = true;
      for (let i = 0; i < output.length; i++) {
        if (!p.queue.length) {
          p.playing = false;
          for(let j=i;j<output.length;j++){p.last*=.96;output[j]+=p.last;}
          break;
        }
        p.last=p.queue[0][p.offset++];output[i] += p.last;
        if (p.offset >= p.queue[0].length) {
          p.queue.shift();
          p.offset = 0;
        }
      }
    }
    for (let i = 0; i < output.length; i++)
      output[i] = Math.tanh(output[i] * 0.8);
    return true;
  }
}
registerProcessor("hxz-voice-playback", VoicePlayback);
