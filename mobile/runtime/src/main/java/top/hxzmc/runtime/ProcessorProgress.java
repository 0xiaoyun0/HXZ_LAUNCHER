package top.hxzmc.runtime;

/** Observes processor output; an idle log is not evidence that the JVM has stopped. */
public final class ProcessorProgress {
    private static final String CONTROL="\u001b[progressmanager;";
    private static final int TEXT_LIMIT=180;
    private final String defaultTitle;
    private final long startedMs;
    private long changedMs,completed=-1,total=-1;
    private long lastLogFingerprint;
    private int lastLogLength=-1;
    private String step="",lastLog="";
    private boolean observed,indeterminate;
    private int lifecycle;

    public ProcessorProgress(String mainClass,long startedMs) {
        defaultTitle=mainClass!=null&&mainClass.contains(".binarypatcher.")?"正在应用游戏补丁":"正在安装游戏加载器";
        this.startedMs=startedMs;changedMs=startedMs;
    }

    /** ProgressReporter uses println; callers pass one complete stdout/stderr line. */
    public synchronized void accept(String line,long nowMs) {
        if(line==null)return;
        if(line.endsWith("\r"))line=line.substring(0,line.length()-1);
        String value=line.trim();
        // trim() removes ESC, so parse the protocol before trimming the original line.
        if(line.startsWith(CONTROL)) {
            control(line.substring(CONTROL.length()),nowMs);return;
        }
        // Never display unknown ANSI or broken progress controls as a normal log line.
        if(line.indexOf('\u001b')>=0||line.indexOf('\u009b')>=0||line.contains("[progressmanager"))return;
        if(!hasControl(line)&&value.equals("[HXZ-JVM] main-complete")) {
            if(lifecycle==0){lifecycle=1;clearCounts();step="";changed(nowMs);}return;
        }
        if(!hasControl(line)&&value.equals("[HXZ-JVM] shutdown-complete")) {
            if(lifecycle<2){lifecycle=2;clearCounts();step="";changed(nowMs);}return;
        }
        String display=text(value);
        if(display.isEmpty())return;
        long fingerprint=fingerprint(value);
        if(!display.equals(lastLog)||value.length()!=lastLogLength||fingerprint!=lastLogFingerprint) {
            lastLog=display;lastLogLength=value.length();lastLogFingerprint=fingerprint;changed(nowMs);
        }
    }

    private void control(String body,long nowMs) {
        if(lifecycle!=0||body.length()<3||body.length()>1024||body.charAt(1)!=' '||hasControl(body))return;
        String value=body.substring(2).trim();
        if(value.isEmpty()||hasControl(value))return;
        switch(body.charAt(0)) {
            case 's':
                value=text(value);
                if(!value.equals(step)){step=value;clearCounts();indeterminate=false;changed(nowMs);}
                break;
            case 'm': {
                long count=number(value);
                if(count>0&&count!=total){total=count;completed=-1;changed(nowMs);}break;
            }
            case 'p': {
                // BinaryPatcher reports ZIP entry counts. A class's "1/1" log is unrelated.
                long count=number(value);
                if(total>0&&count>=0&&count<=total&&count>completed){completed=count;changed(nowMs);}break;
            }
            case 'i':
                if(!value.equals("true")&&!value.equals("false"))return;
                boolean next=value.equals("true");
                if(next!=indeterminate){indeterminate=next;clearCounts();changed(nowMs);}break;
            default: break;
        }
    }

    public synchronized Snapshot snapshot(long nowMs) {
        String title=lifecycle==1?"等待处理器退出":lifecycle==2?"正在校验安装结果":defaultTitle;
        long quiet=elapsed(nowMs,changedMs);
        StringBuilder detail=new StringBuilder();
        if(!step.isEmpty())detail.append(stage(step)).append(" · ");
        detail.append("已用时 ").append(duration(elapsed(nowMs,startedMs)));
        if(observed)detail.append(" · 距最近日志或进度变化 ").append(duration(quiet));
        else detail.append(" · 尚未收到处理日志");
        if(quiet>=120000)detail.append(" · 暂未观察到进展");
        if(!lastLog.isEmpty())detail.append("\n最新日志：").append(lastLog);
        boolean counted=lifecycle==0&&!indeterminate&&total>0&&completed>=0;
        return new Snapshot(title,detail.toString(),counted?completed:-1,counted?total:-1);
    }

    private void clearCounts(){completed=-1;total=-1;}
    private void changed(long nowMs){changedMs=Math.max(changedMs,nowMs);observed=true;}
    private static long number(String value) {
        if(value.length()>19)return -1;
        for(int i=0;i<value.length();i++)if(value.charAt(i)<'0'||value.charAt(i)>'9')return -1;
        try{return Long.parseLong(value);}catch(NumberFormatException ignored){return -1;}
    }
    private static boolean hasControl(String value) {
        for(int i=0;i<value.length();i++)if(Character.isISOControl(value.charAt(i)))return true;
        return false;
    }
    private static long fingerprint(String value) {
        // Keep bounded state while noticing a changed suffix beyond the visible log excerpt.
        long hash=0xcbf29ce484222325L;
        for(int i=0;i<value.length();i++){hash^=value.charAt(i);hash*=0x100000001b3L;}
        return hash;
    }
    private static String text(String value) {
        StringBuilder out=new StringBuilder();int count=0;
        for(int offset=0;offset<value.length();) {
            int code=value.codePointAt(offset);offset+=Character.charCount(code);
            if(Character.isISOControl(code)||Character.getType(code)==Character.FORMAT)continue;
            if(count++==TEXT_LIMIT){out.append('…');break;}
            out.appendCodePoint(code);
        }
        return out.toString().trim();
    }
    private static String stage(String value) {
        switch(value) {
            case "Loading patch files":return "正在读取补丁文件";
            case "Patching input":return "正在处理游戏文件";
            case "Adding new files":return "正在写入新增文件";
            default:return value;
        }
    }
    private static long elapsed(long now,long since) {
        if(now<=since)return 0;
        long value=now-since;return value<0?Long.MAX_VALUE:value;
    }
    private static String duration(long milliseconds) {
        long seconds=milliseconds/1000;
        if(seconds<60)return seconds+"秒";
        if(seconds<3600)return seconds/60+"分"+seconds%60+"秒";
        return seconds/3600+"小时"+seconds/60%60+"分"+seconds%60+"秒";
    }
    public static final class Snapshot {
        public final String title,detail;
        public final long completed,total;
        private Snapshot(String title,String detail,long completed,long total) {
            this.title=title;this.detail=detail;this.completed=completed;this.total=total;
        }
    }
}
