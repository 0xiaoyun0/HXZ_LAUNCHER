/** Shared, token-free bridge for the trusted local LINKING iframe. */
export function mountLinkingBridge(frame: HTMLIFrameElement, request: (path:string, method:string, body?:unknown)=>Promise<unknown>, preferences:()=>unknown) {
  const pathAllowed=(path:unknown)=>typeof path==='string' && path.length<512 && /^\/api\/(?:admin\/)?linking(?:\/[a-z0-9-]+)*(?:\?offset=\d+)?$/.test(path);
  const listener=async(event:MessageEvent)=>{
    if(event.source!==frame.contentWindow||event.data?.channel!=='hxz-linking-v1')return;
    const {id,path,method='GET',body,kind}=event.data;
    if(typeof id!=='string'||id.length>64)return;
    const frameURL=new URL(frame.src,location.href);
    // Electron exposes URL.origin as file://, but its local frame messages use
    // the opaque null origin. The exact contentWindow check remains mandatory.
    const origin=frameURL.protocol==='file:'?'null':frameURL.origin;
    if(origin!=='null'&&event.origin!==origin)return;
    const target=event.source;
    try{
      if(kind!=='preferences'&&(!pathAllowed(path)||!['GET','POST','PUT'].includes(method)||JSON.stringify(body??null).length>1024*1024))throw Error('不支持的 LINKING 请求');
      const value=kind==='preferences'?preferences():await request(path,method,body);
      if(target===frame.contentWindow)target?.postMessage({channel:'hxz-linking-v1',id,value},origin==='null'?'*':origin);
    }catch(error){if(target===frame.contentWindow)target?.postMessage({channel:'hxz-linking-v1',id,error:error instanceof Error?error.message:'请求失败'},origin==='null'?'*':origin);}
  };
  window.addEventListener('message',listener);
  return ()=>window.removeEventListener('message',listener);
}
