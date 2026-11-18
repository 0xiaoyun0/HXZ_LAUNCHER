class MusicCapture extends AudioWorkletProcessor {
 constructor(){super();this.enabled=false;this.buffer=new Int16Array(4800);this.index=0;this.port.onmessage=e=>{this.enabled=!!e.data;this.index=0;};}
 process(inputs){if(this.enabled&&inputs[0]?.[0]){const channels=inputs[0];for(let i=0;i<channels[0].length;i++){let sum=0;for(const c of channels)sum+=c[i]||0;this.buffer[this.index++]=Math.max(-32768,Math.min(32767,sum/channels.length*.65*32767));if(this.index===4800){this.port.postMessage(this.buffer.buffer,[this.buffer.buffer]);this.buffer=new Int16Array(4800);this.index=0;}}}return true;}
}
registerProcessor('hxz-music-capture',MusicCapture);
