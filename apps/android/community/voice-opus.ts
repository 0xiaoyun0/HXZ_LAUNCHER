import {Application,createDecoder,createEncoder,type OpusDecoderHandle} from 'libopus-wasm';

// Older Android WebViews expose Web Audio but have no WebCodecs Opus encoder.
export async function openMobileOpus(){
  const format={sampleRate:48000,channels:1} as const;
  const encoder=await createEncoder({...format,application:Application.Voip,bitrate:24000,complexity:5,dtx:true});
  return {
    encode:(pcm:Float32Array)=>encoder.encodeFloat(pcm),
    music:(playing:boolean)=>{encoder.setBitrate(playing?64000:24000);encoder.setDtx(!playing);},
    close:()=>encoder.free(),
    decoder(output:(pcm:Float32Array)=>void,fail:(error:unknown)=>void){
      let codec:OpusDecoderHandle|undefined,closed=false;
      const pending:Uint8Array[]=[];
      void createDecoder(format).then(handle=>{
        if(closed){handle.free();return;}
        codec=handle;
        for(const bytes of pending)output(handle.decodeFloat(bytes));
        pending.length=0;
      }).catch(error=>{if(!closed)fail(error);});
      return {
        get decodeQueueSize(){return pending.length;},
        decode(bytes:Uint8Array){if(codec)output(codec.decodeFloat(bytes));else if(!closed&&pending.length<6)pending.push(bytes.slice());},
        close(){closed=true;codec?.free();pending.length=0;}
      };
    }
  };
}
