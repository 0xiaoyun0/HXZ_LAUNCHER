class VoiceCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(960);
    this.offset = 0;
    this.credits = 3;
    this.port.onmessage = () => {
      this.credits = Math.min(3, this.credits + 1);
    };
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input)
      for (const sample of input) {
        this.frame[this.offset++] = sample;
        if (this.offset === 960) {
          if (this.credits > 0) {
            this.credits--;
            this.port.postMessage(this.frame, [this.frame.buffer]);
          }
          this.frame = new Float32Array(960);
          this.offset = 0;
        }
      }
    return true;
  }
}
registerProcessor("hxz-voice-capture", VoiceCapture);
