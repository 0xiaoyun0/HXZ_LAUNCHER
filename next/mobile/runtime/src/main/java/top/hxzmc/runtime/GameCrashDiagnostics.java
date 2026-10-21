package top.hxzmc.runtime;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;

/** Bounded crash evidence belonging to one launch of one instance. Call before starting the JVM. */
public final class GameCrashDiagnostics {
    private static final int REPORT_SCAN_BYTES=65536,REPORT_HEAD_CHARS=8192,CAUSE_CHARS=4096,LOG_TAIL_BYTES=6000,MAX_REPORTS=4096;
    private final Path reports;
    private final long startedAt;
    private final Map<String,String> before=new HashMap<>();
    private boolean snapshotComplete;

    public GameCrashDiagnostics(File instance) {
        Path directory=null;
        startedAt=System.currentTimeMillis();
        try {directory=instance.toPath().toRealPath().resolve("crash-reports");}catch(IOException|SecurityException ignored){}
        reports=directory;
        if(reports==null)return;
        try {
            if(!Files.exists(reports,LinkOption.NOFOLLOW_LINKS)){snapshotComplete=true;return;}
            if(!safeDirectory())return;
            int count=0;
            try(DirectoryStream<Path> entries=Files.newDirectoryStream(reports)) {
                for(Path file:entries){if(++count>MAX_REPORTS)return;if(!reportName(file))continue;BasicFileAttributes attrs=attributes(file);if(attrs!=null)before.put(file.getFileName().toString(),stamp(attrs));}
            }
            snapshotComplete=true;
        }catch(IOException|SecurityException|DirectoryIteratorException ignored){}
    }

    /** Raw evidence must pass through the caller's credential scrubber before display or copying. */
    public String collect(File log) {
        StringBuilder out=new StringBuilder();
        Path latest=null;long latestTime=Long.MIN_VALUE;
        if(snapshotComplete)try {
            if(safeDirectory())try(DirectoryStream<Path> entries=Files.newDirectoryStream(reports)) {
                int count=0;
                for(Path file:entries) {
                    if(++count>MAX_REPORTS){latest=null;break;}
                    if(!reportName(file))continue;
                    BasicFileAttributes attrs=attributes(file);if(attrs==null)continue;
                    String old=before.get(file.getFileName().toString());long modified=attrs.lastModifiedTime().toMillis();
                    // Tolerate coarse filesystem timestamps, but never include an unchanged pre-launch report.
                    if(modified<startedAt-2000||stamp(attrs).equals(old))continue;
                    if(modified>latestTime){latest=file;latestTime=modified;}
                }
            }
            if(latest!=null){String report=reportExcerpt(latest.toFile());if(!report.isEmpty())out.append("本次游戏崩溃报告: ").append(latest.getFileName()).append('\n').append(report).append('\n');}
        }catch(IOException|SecurityException|DirectoryIteratorException ignored){}
        String tail=readTail(log,LOG_TAIL_BYTES);
        if(!tail.isEmpty())out.append("本次游戏日志末尾（最多 6000 字节）:\n").append(tail);
        return out.toString();
    }

    private boolean safeDirectory()throws IOException {
        return reports!=null&&!Files.isSymbolicLink(reports)&&Files.isDirectory(reports,LinkOption.NOFOLLOW_LINKS)&&reports.toRealPath().equals(reports);
    }
    private BasicFileAttributes attributes(Path file)throws IOException {
        BasicFileAttributes attrs=Files.readAttributes(file,BasicFileAttributes.class,LinkOption.NOFOLLOW_LINKS);
        return attrs.isRegularFile()&&file.toRealPath().getParent().equals(reports)?attrs:null;
    }
    private static String stamp(BasicFileAttributes attrs){return attrs.size()+":"+attrs.lastModifiedTime()+":"+String.valueOf(attrs.fileKey());}
    private static boolean reportName(Path file){String name=file.getFileName().toString();return name.startsWith("crash-")&&name.endsWith(".txt");}

    private static String reportExcerpt(File file) {
        String prefix;
        long size;
        try(RandomAccessFile in=new RandomAccessFile(file,"r")) {
            size=in.length();byte[] bytes=new byte[(int)Math.min(REPORT_SCAN_BYTES,size)];in.readFully(bytes);prefix=new String(bytes,StandardCharsets.UTF_8);if(size>bytes.length)prefix=completeHead(prefix,prefix.length()-1);
        }catch(IOException|SecurityException ignored){return "";}
        StringBuilder out=new StringBuilder(completeHead(prefix,REPORT_HEAD_CHARS));
        if(prefix.length()>REPORT_HEAD_CHARS) {
            StringBuilder causes=new StringBuilder();int at=out.length();
            while(at<prefix.length()) {
                int end=prefix.indexOf('\n',at);if(end<0)end=prefix.length();String line=prefix.substring(at,end).trim();
                if(line.startsWith("Caused by:")||line.startsWith("Suppressed:")||line.startsWith("Exception in thread")) {
                    int contextEnd=end;
                    for(int i=0;i<4&&contextEnd<prefix.length();i++){int next=prefix.indexOf('\n',contextEnd+1);contextEnd=next<0?prefix.length():next;}
                    causes.append(completeHead(prefix.substring(at,contextEnd),1024)).append('\n');
                }
                at=end+1;
            }
            out.append("\n[报告前部已截断]");
            if(causes.length()>0){out.append("\n后续异常原因（有界摘录）:\n");if(causes.length()<=CAUSE_CHARS)out.append(causes);else {String tail=causes.substring(causes.length()-CAUSE_CHARS/2);int newline=tail.indexOf('\n');out.append(completeHead(causes.toString(),CAUSE_CHARS/2)).append("\n[中间原因已截断]\n").append(newline<0?"":tail.substring(newline+1));}}
        }
        if(size>REPORT_SCAN_BYTES)out.append("\n[仅检查报告前 65536 字节]");
        return out.toString();
    }

    private static String completeHead(String text,int limit) {
        if(text.length()<=limit)return text;
        int newline=text.lastIndexOf('\n',Math.max(0,limit-1));return newline<0?"":text.substring(0,newline+1);
    }

    public static String readTail(File file,int maximumBytes) {
        if(file==null||maximumBytes<=0)return "";
        try(RandomAccessFile in=new RandomAccessFile(file,"r")) {
            long size=in.length(),offset=Math.max(0,size-maximumBytes);in.seek(offset);byte[] bytes=new byte[(int)Math.min(maximumBytes,size)];in.readFully(bytes);
            String text=new String(bytes,StandardCharsets.UTF_8);
            // Drop a partial line so a cut cannot leave an unlabelled fragment of a credential or URL.
            if(offset>0){int newline=text.indexOf('\n');text=newline<0?"":text.substring(newline+1);}
            return text;
        }catch(IOException|SecurityException ignored){return "";}
    }
}
