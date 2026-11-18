package top.hxzmc.runtime;

/** Small deterministic protocol fixtures; does not launch a game or installer. */
public final class ProcessorProgressTest {
    private static final String CONTROL="\u001b[progressmanager;";
    private static int checks;
    private static void check(String name,boolean yes){if(!yes)throw new AssertionError(name);checks++;}
    private static void unknown(String name,ProcessorProgress.Snapshot value){check(name,value.completed==-1&&value.total==-1);}
    private static void command(ProcessorProgress progress,String body,long now){progress.accept(CONTROL+body,now);}
    public static void main(String[] args) {
        ProcessorProgress progress=new ProcessorProgress("net.neoforged.binarypatcher.ConsoleTool",1000);
        check("patcher title",progress.snapshot(1000).title.equals("正在应用游戏补丁"));
        unknown("starts indeterminate",progress.snapshot(1000));
        command(progress,"p 10",2000);unknown("count without max rejected",progress.snapshot(2000));
        command(progress,"s Loading patch files",3000);
        check("loading stage translated",progress.snapshot(3000).detail.contains("正在读取补丁文件"));
        command(progress,"s Patching input",4000);command(progress,"m 103",5000);
        unknown("max alone does not fabricate completed zero",progress.snapshot(5000));
        command(progress,"p 10",6000);
        check("actual entry count",progress.snapshot(6000).completed==10&&progress.snapshot(6000).total==103);
        command(progress,"p 10",125000);
        check("duplicate count does not imply activity",progress.snapshot(126000).detail.contains("暂未观察到进展"));
        command(progress,"p 100",127000);
        check("actual count resumes activity",!progress.snapshot(127000).detail.contains("暂未观察到进展"));
        command(progress,"s Adding new files",128000);
        unknown("new file stage clears old denominator",progress.snapshot(128000));
        check("new files stage translated",progress.snapshot(128000).detail.contains("正在写入新增文件"));
        command(progress,"p 103",129000);unknown("old final count cannot restore ratio",progress.snapshot(129000));

        command(progress,"s Patching input",130000);command(progress,"m 100",131000);command(progress,"p 30",132000);
        for(String bad:new String[]{"p -1","p +1","p 1.2","p 20%","p 101","p 29","p 9223372036854775808","p 99999999999999999999999","m 0","m -5","m NaN","m 9223372036854775808","i maybe","x hello","p","p\t31","p 31\u0000"})command(progress,bad,140000);
        check("invalid counts cannot overwrite evidence",progress.snapshot(140000).completed==30&&progress.snapshot(140000).total==100);
        command(progress,"s Patching input",150000);
        check("duplicate stage preserves measured progress",progress.snapshot(150000).completed==30);
        command(progress,"m 200",151000);unknown("changed max requires fresh count",progress.snapshot(151000));
        command(progress,"p 0",152000);check("explicit zero is observed",progress.snapshot(152000).completed==0);
        command(progress,"i true",153000);unknown("indeterminate clears counts",progress.snapshot(153000));
        command(progress,"m 200",154000);command(progress,"p 20",155000);unknown("indeterminate cannot expose ratio",progress.snapshot(155000));
        command(progress,"i false",156000);unknown("switch back cannot reuse stale ratio",progress.snapshot(156000));
        command(progress,"m 9223372036854775807",157000);command(progress,"p 9223372036854775807",158000);
        check("long boundary accepted without overflow",progress.snapshot(158000).completed==Long.MAX_VALUE&&progress.snapshot(158000).total==Long.MAX_VALUE);

        ProcessorProgress logs=new ProcessorProgress("net.minecraftforge.binarypatcher.ConsoleTool",0);
        logs.accept("  Patching net.minecraft.Example 1/1",1000);
        unknown("ordinary patch fractions are not totals",logs.snapshot(1000));
        logs.accept("  Patching net.minecraft.Example 1/1",120000);
        check("repeated log does not refresh progress clock",logs.snapshot(121000).detail.contains("暂未观察到进展"));
        check("elapsed remains visible while waiting",logs.snapshot(121000).detail.contains("已用时 2分1秒"));
        logs.accept("Patching net.minecraft.Other 1/1",122000);
        check("changed ordinary log resumes activity",!logs.snapshot(122000).detail.contains("暂未观察到进展"));
        String before=logs.snapshot(123000).detail;
        for(String bad:new String[]{"\u001b[unknown;value", "\u009bprogressmanager;s hidden", "[progressmanager;p 20", "prefix "+CONTROL+"p 50", CONTROL+"s bad\nline",CONTROL+"x not UI",CONTROL+"s "})logs.accept(bad,123000);
        logs.accept(null,123000);logs.accept(" \t ",123000);
        check("malformed controls never reach display or refresh",logs.snapshot(123000).detail.equals(before));
        StringBuilder longLine=new StringBuilder();for(int i=0;i<400;i++)longLine.append("😀");
        logs.accept(longLine.toString(),124000);String shown=logs.snapshot(124000).detail;
        check("ordinary logs bounded by code points",shown.length()<600&&shown.endsWith("…"));
        check("truncation preserves surrogate pair",!Character.isHighSurrogate(shown.charAt(shown.length()-2)));
        logs.accept(longLine.toString()+" new suffix",245000);
        check("changed truncated suffix remains activity",!logs.snapshot(245000).detail.contains("暂未观察到进展"));
        logs.accept("visible\u0000\u0007\u202e text",246000);
        check("normal log controls removed",!logs.snapshot(246000).detail.contains("\u0000")&&!logs.snapshot(246000).detail.contains("\u202e"));

        progress.accept("[HXZ-JVM] main-complete",160000);
        check("main return waits for actual shutdown",progress.snapshot(160000).title.equals("等待处理器退出"));
        unknown("main return clears ratio",progress.snapshot(160000));
        command(progress,"s Patching input",161000);command(progress,"m 5",161000);command(progress,"p 5",161000);
        check("late protocol cannot undo main return",progress.snapshot(161000).title.equals("等待处理器退出"));
        unknown("late protocol cannot restore ratio",progress.snapshot(161000));
        progress.accept("[HXZ-JVM] main-complete",279000);
        check("repeated main marker does not fake activity",progress.snapshot(280000).detail.contains("暂未观察到进展"));
        progress.accept("[HXZ-JVM] shutdown-complete",281000);
        check("shutdown requests verification not install complete",progress.snapshot(281000).title.equals("正在校验安装结果"));
        progress.accept("[HXZ-JVM] main-complete",282000);
        check("lifecycle does not regress",progress.snapshot(282000).title.equals("正在校验安装结果"));
        unknown("verification has no invented ratio",progress.snapshot(282000));
        ProcessorProgress empty=new ProcessorProgress(null,1000);
        check("other processor title",empty.snapshot(1000).title.equals("正在安装游戏加载器"));
        check("long silent start explains uncertainty",empty.snapshot(121000).detail.contains("尚未收到处理日志")&&empty.snapshot(121000).detail.contains("暂未观察到进展"));
        check("clock reversal never creates negative elapsed",empty.snapshot(0).detail.contains("已用时 0秒"));
        check("elapsed arithmetic saturates safely",!new ProcessorProgress(null,Long.MIN_VALUE).snapshot(Long.MAX_VALUE).detail.contains("已用时 -"));
        ProcessorProgress crlf=new ProcessorProgress("net.neoforged.binarypatcher.ConsoleTool",0);
        command(crlf,"s Patching input\r",1000);command(crlf,"m 10\r",1000);command(crlf,"p 5\r",1000);
        check("LF reader can retain the CR of a CRLF line",crlf.snapshot(1000).completed==5&&crlf.snapshot(1000).total==10);
        System.out.println("PASS ProcessorProgress "+checks+" checks");
    }
}
