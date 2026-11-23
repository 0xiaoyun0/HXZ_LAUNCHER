import top.hxzmc.runtime.GameCrashDiagnostics;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;

public final class GameCrashDiagnosticsTest {
    private static int checks;
    public static void main(String[] args)throws Exception {
        Path instance=Files.createTempDirectory("hxz-crash-evidence-");
        Path reports=Files.createDirectories(instance.resolve("crash-reports"));
        Path log=instance.resolve("game.log");
        Path old=write(reports.resolve("crash-old-client.txt"),"OLD_REPORT_DO_NOT_USE\n");
        // An old report may have a future timestamp. Snapshot identity must still exclude it.
        Files.setLastModifiedTime(old,FileTime.fromMillis(System.currentTimeMillis()+60000));
        GameCrashDiagnostics launch=new GameCrashDiagnostics(instance.toFile());
        check(!launch.collect(log.toFile()).contains("OLD_REPORT"),"unchanged report excluded");
        Path elsewhere=Files.createTempDirectory("hxz-other-instance-");
        write(Files.createDirectories(elsewhere.resolve("crash-reports")).resolve("crash-other-client.txt"),"OTHER_INSTANCE_DO_NOT_USE\n");
        StringBuilder report=new StringBuilder("---- Minecraft Crash Report ----\nDescription: Initializing game\njava.lang.IllegalStateException: ORIGINAL_FAILURE\n");
        for(int i=0;i<500;i++)report.append("\tat example.Launch.start(Launch.java:1)\n");
        report.append("Caused by: java.lang.UnsatisfiedLinkError: ROOT_CAUSE\n\tat example.Native.open(Native.java:1)\n");
        for(int i=0;i<10000;i++)report.append("mod list: ordinary compatible mod\n");
        Path current=write(reports.resolve("crash-current-client.txt"),report.toString());
        // Sparse large reports verify the reader's fixed byte budget without allocating the file in memory.
        try(RandomAccessFile file=new RandomAccessFile(current.toFile(),"rw")){file.setLength(256L*1024*1024);}
        StringBuilder output=new StringBuilder("secret-fragment-prefix-");for(int i=0;i<7000;i++)output.append('x');output.append("\nGAME_LOG_TAIL\n");
        write(log,output.toString());
        String evidence=launch.collect(log.toFile());
        check(evidence.contains("ORIGINAL_FAILURE"),"original exception precedes huge mod inventory");
        check(evidence.contains("ROOT_CAUSE"),"cause beyond first report excerpt retained");
        check(evidence.contains("GAME_LOG_TAIL"),"bounded runtime log tail retained");
        check(evidence.contains("65536"),"large report scan limit disclosed");
        check(evidence.length()<19000,"combined runtime evidence bounded");
        check(!evidence.contains("OLD_REPORT")&&!evidence.contains("OTHER_INSTANCE"),"only current instance launch used");
        check(!evidence.contains("xxxxxxxx"),"partial first log line omitted");
        Files.delete(current);
        Path stale=write(reports.resolve("crash-copied-old-client.txt"),"STALE_COPIED_REPORT\n");
        Files.setLastModifiedTime(stale,FileTime.fromMillis(System.currentTimeMillis()-60000));
        check(!launch.collect(log.toFile()).contains("STALE_COPIED_REPORT"),"new file with old timestamp excluded");
        write(old,"OVERWRITTEN_THIS_RUN\n");
        check(launch.collect(log.toFile()).contains("OVERWRITTEN_THIS_RUN"),"overwritten same-name report detected");
        Path emptyInstance=Files.createTempDirectory("hxz-crash-missing-dir-");
        GameCrashDiagnostics first=new GameCrashDiagnostics(emptyInstance.toFile());
        write(Files.createDirectories(emptyInstance.resolve("crash-reports")).resolve("crash-first-client.txt"),"NEW_DIRECTORY_REPORT\n");
        check(first.collect(null).contains("NEW_DIRECTORY_REPORT"),"report directory created during launch supported");
        check(new GameCrashDiagnostics(instance.resolve("missing").toFile()).collect(log.toFile()).contains("GAME_LOG_TAIL"),"missing instance still permits runtime tail");
        try {
            Path links=Files.createTempDirectory("hxz-crash-links-");
            GameCrashDiagnostics linked=new GameCrashDiagnostics(links.toFile());
            Files.createSymbolicLink(links.resolve("crash-reports"),reports);
            check(!linked.collect(null).contains("OVERWRITTEN_THIS_RUN"),"symlink report directory excluded");
            Path local=Files.createTempDirectory("hxz-crash-linked-file-");
            Path localReports=Files.createDirectories(local.resolve("crash-reports"));GameCrashDiagnostics fileLaunch=new GameCrashDiagnostics(local.toFile());
            Files.createSymbolicLink(localReports.resolve("crash-link-client.txt"),old);
            check(fileLaunch.collect(null).isEmpty(),"symlink report file excluded");
        }catch(UnsupportedOperationException|FileSystemException denied){System.out.println("Symlink fixture unavailable: "+denied.getClass().getSimpleName());}
        System.out.println("PASS GameCrashDiagnostics "+checks+" checks");
    }
    private static Path write(Path file,String text)throws IOException{return Files.write(file,text.getBytes(StandardCharsets.UTF_8));}
    private static void check(boolean pass,String message){checks++;if(!pass)throw new AssertionError(message);}
}
