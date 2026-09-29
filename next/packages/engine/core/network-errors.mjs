export function networkFailure(error){
 const code=String(error?.cause?.code||error?.code||'');
 return error?.network===true||/^(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|UND_ERR_.*)$/.test(code)||['TimeoutError'].includes(error?.name)||error?.message==='fetch failed';
}
export function networkAdvice(error,host){
 const code=String(error?.cause?.code||error?.code||'');
 const reason=/ENOTFOUND|EAI_AGAIN/.test(code)?'域名解析失败':/ENETUNREACH|EHOSTUNREACH/.test(code)?'本机到目标的网络不可达':error?.status===429?'源站限流':error?.status>=500?'源站服务异常':/timeout|超时/i.test(error?.name+' '+error?.message)||/TIMEOUT|TIMEDOUT/.test(code)?'连接或传输超时':error?.message||'连接失败';
 return `${host}：${reason}${networkFailure(error)?'；会尝试备用源，单个节点失败不能直接判定本地断网':''}`;
}
