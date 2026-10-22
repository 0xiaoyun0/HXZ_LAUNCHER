package top.hxzmc.runtime;

import java.util.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** A shareable excerpt. Callers still redact the entire result before displaying or copying it. */
public final class GameLiveDiagnostics {
    public static final int MAX_CHARS=4800;
    private GameLiveDiagnostics(){}

    public static String summarize(String metadata,String gameLog,String instanceLog,String snapshots) {
        StringBuilder out=new StringBuilder("HXZ 游戏实时诊断（精简）\n");
        String[] header=lines(metadata);for(int i=1;i<Math.min(3,header.length);i++)append(out,header[i],180);
        out.append("等待线程本身不是报错；以下是两次采样的关键位置。\n\n");
        String snapshotText=snapshots==null?"":snapshots;int firstSample=snapshotText.indexOf("JVM 线程快照 ");
        String loading=firstSample<0?snapshotText:snapshotText.substring(0,firstSample);
        boolean primary=loading.startsWith("模组加载错误");if(primary)out.append(head(loading,1900)).append('\n');
        List<String> samples=new ArrayList<>();StringBuilder current=null;
        for(String line:lines(snapshots)){
            if(line.startsWith("JVM 线程快照 ")){if(current!=null)samples.add(current.toString());current=new StringBuilder();}
            if(current!=null)current.append(line).append('\n');
        }
        if(current!=null)samples.add(current.toString());
        if(samples.isEmpty())out.append("JVM 暂未回应线程采样；当前证据不足，不能直接判定死锁或网络故障。\n");
        else for(int i=0;i<Math.min(2,samples.size());i++)out.append(sample(samples.get(i),primary?900:1800));
        out.append("\n最近日志（异常上下文与末尾）:\n").append(logExcerpt(gameLog,instanceLog,650));
        out.append("\n完整诊断保留在本机；长按“复制诊断”可复制完整记录。\n");
        return head(out.toString(),MAX_CHARS);
    }

    private static String sample(String text,int limit) {
        String[] rows=lines(text);StringBuilder out=new StringBuilder();List<Block> blocks=new ArrayList<>();Block current=null;
        for(String line:rows){
            if(line.startsWith("\"")){current=new Block(line);blocks.add(current);}
            else if(current!=null&&line.startsWith("  "))current.rows.add(line);
            else if(current==null&&(line.startsWith("JVM ")||line.startsWith("堆内存")||line.startsWith("锁与")))append(out,line,220);
        }
        Set<String> owners=new HashSet<>();
        for(Block block:blocks)if(block.rank()<=1)for(String line:block.rows)if(line.contains("锁持有者:")){int at=line.lastIndexOf('#');if(at>=0)owners.add(line.substring(at));}
        blocks.sort(Comparator.comparingInt((Block b)->b.rank()<=1?b.rank():owners.contains(b.id())?2:b.rank()));
        int count=0;
        for(Block block:blocks){
            if(block.rank()>3&&!owners.contains(block.id()))continue;
            StringBuilder item=new StringBuilder();append(item,block.header,190);
            int frames=0;String modFrame=null;
            for(String line:block.rows){
                if(!line.startsWith("  at ")){append(item,line,130);continue;}
                if(frames++<3)append(item,line,145);
                else if(modFrame==null&&!platformFrame(line))modFrame=line;
            }
            if(modFrame!=null){item.append("  …调用方:\n");append(item,modFrame,145);}
            int budget=Math.min(520,limit-out.length()-1);if(budget<190)break;
            out.append(head(item.toString(),budget));if(++count==3)break;
        }
        if(count==0)out.append("未采集到渲染或加载线程，请刷新诊断。\n");
        return head(out.toString(),limit)+"\n";
    }

    private static boolean platformFrame(String line){return line.contains("java.base/")||line.contains("java.base@")||line.contains("java.util.")||line.contains("java.lang.")||line.contains("jdk.internal.")||line.contains("sun.misc.");}
    public static boolean brokenState(String text){return text!=null&&text.contains("to a broken mod state");}
    private static boolean loadingFailure(String line){String lower=line.toLowerCase(Locale.ROOT);return lower.contains("failed to create mod instance")||lower.contains("modloadingexception")||lower.contains("loadingfailedexception")||lower.contains("failed to complete lifecycle event")||lower.contains("exception caught during firing event")||lower.contains("failure during early loading")||lower.contains("mod loading error")||lower.contains("caused by:");}

    /** Read early loading failures only on the known cascade path. Memory and scan work are bounded. */
    public static String readEvidence(File file,int tailBytes){
        String tail=GameCrashDiagnostics.readTail(file,tailBytes);if(!brokenState(tail)||file==null)return tail;
        StringBuilder out=new StringBuilder(),line=new StringBuilder();int context=0,blocks=0;boolean oversized=false;
        try(Reader reader=new BufferedReader(new InputStreamReader(new FileInputStream(file),StandardCharsets.UTF_8))){
            for(int read=0;read<16*1024*1024&&out.length()<12000;read++){
                int next=reader.read();if(next<0)break;
                if(next!='\n'){if(line.length()<16000)line.append((char)next);else oversized=true;continue;}
                String row=line.toString();line.setLength(0);if(oversized){oversized=false;context=0;continue;}
                if(loadingFailure(row)&&!brokenState(row)&&blocks<8){context=12;blocks++;}
                if(context>0){if(!brokenState(row))out.append(row).append('\n');context--;}
            }
        }catch(IOException|SecurityException ignored){}
        return out.length()==0?tail:"启动早期异常（有界扫描）:\n"+out+"\n当前末尾:\n"+tail;
    }
    private static String logExcerpt(String first,String second,int limit){
        String[] rows=lines(first+"\n"+second);SortedSet<Integer> chosen=new TreeSet<>();int errors=0;
        for(int i=0;i<rows.length;i++)if(loadingFailure(rows[i])&&!brokenState(rows[i])){for(int j=i;j<Math.min(rows.length,i+4);j++)if(!brokenState(rows[j]))chosen.add(j);if(++errors==3)break;}
        errors=0;for(int i=rows.length-1;i>=0&&errors<4;i--){String lower=rows[i].toLowerCase(Locale.ROOT);if(!brokenState(rows[i])&&(lower.contains("caused by:")||lower.contains("/error]")||lower.contains("/fatal]")||lower.contains("exception")||lower.contains("failed"))){for(int j=i;j<Math.min(rows.length,i+3);j++)if(!brokenState(rows[j]))chosen.add(j);errors++;}}
        int tail=0;for(int i=rows.length-1;i>=0&&tail<5;i--)if(!rows[i].trim().isEmpty()&&!brokenState(rows[i])){chosen.add(i);tail++;}
        List<String> excerpt=new ArrayList<>();Set<String> seen=new HashSet<>();for(int index:chosen){String line=rows[index];if(!line.trim().isEmpty()&&seen.add(line))excerpt.add(shortLine(line,280));}
        StringBuilder out=new StringBuilder();for(String line:excerpt){if(out.length()+line.length()+1>limit)continue;out.append(line).append('\n');}
        return out.length()==0?"当前没有可读取的游戏日志。\n":out.toString();
    }
    private static String[] lines(String text){return (text==null?"":text).replace("\r","").split("\n");}
    private static String shortLine(String line,int limit){return limit<=0?"":line.length()<=limit?line:line.substring(0,limit-1)+"…";}
    private static void append(StringBuilder out,String line,int limit){out.append(shortLine(line,limit)).append('\n');}
    private static String head(String text,int limit){if(limit<=0)return "";if(text.length()<=limit)return text;int end=text.lastIndexOf('\n',Math.max(0,limit-1));return end<0?shortLine(text,limit):text.substring(0,end+1);}
    private static final class Block {
        final String header;final List<String> rows=new ArrayList<>();Block(String header){this.header=header;}
        String id(){int at=header.lastIndexOf('#'),end=header.indexOf(' ',at);return at<0?"":header.substring(at,end<0?header.length():end);}
        int rank(){
            String lower=header.toLowerCase(Locale.ROOT);if(lower.startsWith("\"render thread\""))return 0;if(lower.startsWith("\"main\""))return 1;
            if(lower.contains("modload")||lower.contains("mod load")||lower.contains("mod-loading")||lower.contains("loading-worker"))return 2;
            if(header.contains(" BLOCKED"))return 3;
            for(String line:rows)if(line.contains("net.neoforged.fml.")||line.contains("net.minecraftforge.fml.")||line.contains("org.spongepowered.asm.mixin."))return 3;
            return 8;
        }
    }
}
