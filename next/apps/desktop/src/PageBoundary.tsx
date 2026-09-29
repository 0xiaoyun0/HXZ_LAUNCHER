import {Component,type ReactNode,type ErrorInfo} from 'react';
import {AlertTriangle,RotateCcw,Copy} from 'lucide-react';
import {Button} from './ui';
import {invoke,desktop,notify} from './model';
function diagnostic(error:Error,info?:ErrorInfo){
  return ('幻想镇 NEXT · 页面异常\n'+new Date().toISOString()+'\n页面：'+location.hash+'\n'+error.stack+'\n'+(info?.componentStack||''))
    .replace(/(Bearer\s+)[\w.\-]+/gi,'$1[已隐藏]').replace(/([?&](?:token|key|password|secret)=)[^\s&#]+/gi,'$1[已隐藏]').slice(0,12000);
}
/** A broken view must not take away navigation or running task controls. */
export class PageBoundary extends Component<{children:ReactNode},{error:Error|null;details:string}> {
  state={error:null as Error|null,details:''};
  static getDerivedStateFromError(error:Error){return {error};}
  componentDidCatch(error:Error,info:ErrorInfo){const details=diagnostic(error,info);this.setState({details});if(desktop)void invoke('renderer.diagnostic',{details}).catch(()=>{});}
  render(){if(!this.state.error)return this.props.children;return <section className="page-recovery" role="alert"><AlertTriangle size={29}/><h2>这个页面暂时无法显示</h2><p>可以重新打开页面。正在进行的下载和游戏任务不会因此结束。</p><details><summary>查看错误</summary><pre>{this.state.details||this.state.error.message}</pre></details><div className="actions"><Button icon={RotateCcw} onClick={()=>this.setState({error:null,details:''})}>重新打开</Button><Button icon={Copy} onClick={async()=>{await navigator.clipboard.writeText(this.state.details);notify('错误信息已复制');}}>复制错误</Button></div></section>;}
}
