import top.hxzmc.runtime.GameLiveDiagnostics;

public final class GameLiveDiagnosticsTest {
    private static void check(boolean ok,String reason){if(!ok)throw new AssertionError(reason);}
    private static int count(String text,String needle){return text.split(java.util.regex.Pattern.quote(needle),-1).length-1;}
    private static String repeat(String text,int n){StringBuilder out=new StringBuilder();for(int i=0;i<n;i++)out.append(text);return out.toString();}
    public static void main(String[] args)throws Exception{
        StringBuilder snapshots=new StringBuilder();
        for(int sample=1;sample<=2;sample++){
            snapshots.append("JVM 线程快照 ").append(sample).append(" · 123456789\n堆内存 MiB: used=2048 max=3548\nJVM 未检测到 Java 锁循环；不能排除原生调用或其他等待\n");
            for(int i=0;i<160;i++)snapshots.append('"').append("AAA idle worker ").append(i).append("\" #").append(i+100).append(" TIMED_WAITING\n  at java.base/java.lang.Thread.sleep(Native Method)\n");
            snapshots.append("\"Render thread\" #11 WAITING\n  等待锁: java.util.concurrent.CompletableFuture\n  锁持有者: \"Mod loading worker\" #12\n  累计 CPU ms: 100\n");
            snapshots.append(repeat("  at java.base/java.util.concurrent.CompletableFuture.waitingGet(CompletableFuture.java:100)\n",40));
            snapshots.append("  at net.neoforged.fml.ModLoader.waitForTask(ModLoader.java:99)\n");
            snapshots.append("\"main\" #1 WAITING\n  at java.base/java.lang.Thread.join(Thread.java:3)\n  at example.Game.main(Game.java:1)\n");
            snapshots.append("\"Mod loading worker\" #12 RUNNABLE\n  位于原生调用\n  at example.ClientRenderer.initialize(Native Method)\n  at net.neoforged.fml.ModLoader.load(ModLoader.java:1)\n");
        }
        String metadata="HXZ Android 游戏诊断\n0.8.4 / 80418\nvivo V2408A · Android 16\n"+repeat("普通模组清单，不能淹没关键线程\n",2000);
        String logs=repeat("[INFO] ordinary mod discovery\n",2000)+"[Render thread/ERROR] Render setup failed\nCaused by: example.ExactCause\n  at example.Client.init(Client.java:2)\n[INFO] LAST_LOG_MARKER\n";
        String brief=GameLiveDiagnostics.summarize(metadata,logs,"",snapshots.toString());
        check(brief.length()<=GameLiveDiagnostics.MAX_CHARS,"copy text exceeds sharing budget");
        check(count(brief,"\"Render thread\"")==2,"render thread missing from one sample");
        check(count(brief,"\"main\"")==2,"main thread missing from one sample");
        check(count(brief,"\"Mod loading worker\" #12 RUNNABLE")==2,"loader thread missing from one sample");
        check(brief.contains("锁持有者")&&brief.contains("used=2048"),"lock/heap evidence lost");
        check(brief.contains("example.ExactCause")&&brief.contains("LAST_LOG_MARKER"),"exception or most recent log line lost");
        check(!brief.contains("AAA idle worker")&&!brief.contains("普通模组清单"),"idle thread/mod inventory displaced key evidence");
        check(!brief.contains("已确认死锁")&&!brief.contains("DNS 故障"),"diagnosis invents an unproven cause");
        String missing=GameLiveDiagnostics.summarize("",null,null,"");
        check(missing.contains("证据不足")&&missing.length()<4800,"missing response misreported");
        String waiting=GameLiveDiagnostics.summarize(metadata,"","","JVM 线程快照 1\n\"pool-1-thread-1\" TIMED_WAITING\n  at java.util.concurrent.ScheduledThreadPoolExecutor.take(File.java:1)\n");
        check(waiting.contains("未采集到渲染或加载线程"),"idle worker tail presented as the blocking cause");
        String many=GameLiveDiagnostics.summarize(metadata,repeat("[ERROR] "+repeat("x",400)+"\n",100),"",snapshots.toString());
        check(many.length()<=4800&&count(many,"Render thread")==2,"large errors displaced second snapshot");
        String texture="JVM 线程快照 1\n堆内存 MiB: used=3169 max=5204\n\"Render thread\" #1 RUNNABLE\n  位于原生调用\n  累计 CPU ms: 80808\n"
            +"  at MC-BOOTSTRAP/org.lwjgl.opengl@3.3.3+5/org.lwjgl.opengl.GL11C.nglTexSubImage2D(Native Method)\n"
            +"  at MC-BOOTSTRAP/org.lwjgl.opengl@3.3.3+5/org.lwjgl.opengl.GL11C.glTexSubImage2D(GL11C.java:2105)\n"
            +"  at MC-BOOTSTRAP/org.lwjgl.opengl@3.3.3+5/org.lwjgl.opengl.GL11.glTexSubImage2D(GL11.java:7365)\n"
            +"  at TRANSFORMER/minecraft@1.21.1/com.mojang.blaze3d.platform.GlStateManager._texSubImage2D(GlStateManager.java:568)\n"
            +"  at TRANSFORMER/minecraft@1.21.1/com.mojang.blaze3d.platform.NativeImage.upload(NativeImage.java:211)\n"
            +"  at TRANSFORMER/minecraft@1.21.1/net.minecraft.client.renderer.texture.SpriteContents$Ticker.uploadFrame(SpriteContents.java:301)\n"
            +"  at TRANSFORMER/minecraft@1.21.1/net.minecraft.client.renderer.texture.TextureAtlas.tick(TextureAtlas.java:99)\n";
        String textured=GameLiveDiagnostics.summarize(metadata+"内存配置: Java 上限 5204 MiB；手动设置 6144 MiB；扩展预算关闭\n","","",texture+texture.replace("快照 1","快照 2"));
        check(textured.contains("SpriteContents$Ticker.uploadFrame")&&textured.contains("TextureAtlas.tick"),"texture upload owner hidden behind LWJGL/NativeImage plumbing");
        check(textured.contains("手动设置 6144 MiB")&&textured.contains("扩展预算关闭"),"actual memory mode missing from compact report");
        check(count(textured,"nglTexSubImage2D")==2&&textured.length()<=4800,"texture detail displaced native call or sharing budget");
        String original="[09:10:00] [modloading-worker-0/ERROR] [ne.ne.fm.ModLoader/]: Failed to create mod instance. ModID: fixture_client\njava.lang.IllegalStateException: Fixture initialization failed\nCaused by: java.lang.UnsatisfiedLinkError: fixture-native-library.so\n  at fixture.Client.initialize(Client.java:7)\n";
        String cascade=repeat("[09:12:43] [Worker-ResourceReload-4/ERROR] [ne.ne.fm.ModLoader/]: Cowardly refusing to send event net.neoforged.neoforge.client.event.ModelEvent$ModifyBakingResult to a broken mod state\n",100);
        String broken=GameLiveDiagnostics.summarize(metadata,original+cascade,"",snapshots.toString());
        check(broken.contains("fixture_client")&&broken.contains("fixture-native-library.so"),"broken-state cascades hid the original loading failure");
        java.nio.file.Path file=java.nio.file.Files.createTempFile("hxz-loading-errors-",".log");
        try{
            java.nio.file.Files.write(file,(original+repeat("[INFO] resource loading\n",3000)+cascade).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            String evidence=GameLiveDiagnostics.readEvidence(file.toFile(),18000);
            check(evidence.contains("fixture_client")&&evidence.contains("fixture-native-library.so"),"early loading failure outside log tail was lost");
            String stored="模组加载错误（加载器保留的原始原因）:\n1. fml.modloadingissue.failedtoloadmod\n  模组: fixture_client\n  Caused by: java.lang.UnsatisfiedLinkError: fixture-native-library.so\n"+snapshots;
            String identified=GameLiveDiagnostics.summarize(metadata,evidence,"",stored);
            check(identified.indexOf("fixture_client")<identified.indexOf("JVM 线程快照"),"loader original error must appear before routine waiting threads");
            check(identified.length()<=4800&&count(identified,"\"Render thread\"")==2,"loader error displaced independent render snapshots");
            java.nio.file.Files.write(file,"[INFO] healthy world\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            check(GameLiveDiagnostics.readEvidence(file.toFile(),18000).equals("[INFO] healthy world\n"),"healthy games must keep lightweight tail-only reading");
        }finally{java.nio.file.Files.deleteIfExists(file);}
        System.out.println("PASS compact diagnostics: both key snapshots, owner/native evidence, log cause and tail, bounded sharing, no invented hang diagnosis");
    }
}
