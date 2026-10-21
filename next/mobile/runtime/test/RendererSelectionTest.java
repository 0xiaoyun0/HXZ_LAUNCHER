package top.hxzmc.runtime;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.Arrays;
import org.json.JSONArray;
import org.json.JSONObject;

public final class RendererSelectionTest {
    private static int checks;
    private static JSONArray manifest() throws Exception {
        return new JSONArray().put(renderer("softpipe")).put(renderer("zink"));
    }

    private static JSONObject renderer(String driver) throws Exception {
        return new JSONObject().put("id",driver).put("kind","osmesa").put("driver",driver)
                .put("library","app_runtime/renderers/osmesa/libOSMesa.so")
                .put("requiresVulkan",driver.equals("zink"));
    }

    // Extracted from GameRuntimeActivity.selectRenderer before the 80409 fix.
    private static JSONObject legacyAuto(JSONArray renderers, boolean vulkan) throws Exception {
        String selected="auto";
        JSONObject fallback=null;
        for(int i=0;i<renderers.length();i++) {
            JSONObject item=renderers.getJSONObject(i);
            if(!item.optString("kind").equals("osmesa")||!Arrays.asList("zink","softpipe").contains(item.optString("driver")))continue;
            if(item.optBoolean("requiresVulkan")&&!vulkan)continue;
            if(item.optString("id").equals(selected))return item;
            if(selected.equals("auto")&&(fallback==null||item.optString("driver").equals("zink")))fallback=item;
        }
        if(fallback!=null)return fallback;
        throw new IOException("当前设备不支持所选渲染器，请在运行设置中选择自动检测");
    }

    public static void main(String[] args) throws Exception {
        if(args.length>0&&args[0].equals("--legacy-repro")) {
            JSONObject selected=legacyAuto(manifest(),false);
            System.out.println("Legacy auto: Android Vulkan feature=false, available probe=Zink (Adreno 730), selected="+selected.getString("driver"));
            if(!selected.getString("driver").equals("zink"))throw new AssertionError("GPU-capable auto selection incorrectly fell back to softpipe");
            return;
        }
        JSONArray manifest=manifest();
        String original=manifest.toString();
        check("Legacy fixture reproduces incorrect software selection",legacyAuto(manifest,false).getString("driver").equals("softpipe"));
        RendererSelection.Selection selected=RendererSelection.select(manifest,"auto",r->gpu("Zink (Adreno 730)"));
        check("Auto uses working GPU without an Android feature flag",!selected.software&&selected.renderer.getString("driver").equals("zink"));
        check("Successful probe details remain visible",selected.diagnostic.contains("Adreno 730")&&selected.diagnostic.contains("32x32"));

        RendererSelection.Selection software=RendererSelection.select(manifest,"softpipe",r->{throw new AssertionError("Explicit software selection must not launch a GPU probe");});
        check("Explicit software preference is respected",software.software&&software.renderer.getString("id").equals("softpipe"));
        check("Explicit software has no automatic fallback claim",!software.diagnostic.contains("回退"));

        for(String name:Arrays.asList("softpipe","LLVMpipe (LLVM 19.1.7, 128 bits)","Zink (lavapipe)","Software Rasterizer","Zink (SwiftShader Device)","SOFTWARE-RASTERIZER")) {
            RendererSelection.Selection fallback=RendererSelection.select(manifest,"auto",r->gpu(name));
            check("Reject software renderer: "+name,fallback.software&&fallback.diagnostic.contains(name)&&fallback.diagnostic.contains("本次回退"));
        }
        RendererSelection.Selection failed=RendererSelection.select(manifest,"auto",r->{throw new IOException("vkCreateInstance failed: -9");});
        check("Auto fallback preserves native failure",failed.software&&failed.diagnostic.contains("vkCreateInstance failed: -9"));
        check("Fallback is explicitly temporary",failed.diagnostic.contains("设置保持不变"));
        RendererSelection.Selection recovered=RendererSelection.select(manifest,"auto",r->gpu("Zink (Mali-G715)"));
        check("Next auto launch probes again and can recover GPU",!recovered.software&&recovered.renderer.getString("driver").equals("zink"));
        check("Manifest is never rewritten",original.equals(manifest.toString()));

        RendererSelection.Selection oldGl=RendererSelection.select(manifest,"auto",r->new RendererSelection.ProbeResult(false,"Adreno 730","OpenGL context creation failed"));
        check("GPU name alone cannot bypass OpenGL 3.3 creation failure",oldGl.software&&oldGl.diagnostic.contains("OpenGL 3.3")&&oldGl.diagnostic.contains("creation failed"));
        RendererSelection.Selection missing=RendererSelection.select(manifest,"auto",r->new RendererSelection.ProbeResult(true,"", "empty GL string"));
        check("Empty GL_RENDERER is not accepted as GPU",missing.software&&missing.diagnostic.contains("GL_RENDERER"));
        check("Missing probe result falls back with a reason",RendererSelection.select(manifest,"auto",r->null).diagnostic.contains("没有返回结果"));

        check("Explicit Zink succeeds on actual hardware",!RendererSelection.select(manifest,"zink",r->gpu("Zink (Adreno 730)")).software);
        rejects("Explicit Zink does not silently select software","实际为软件模拟",()->RendererSelection.select(manifest,"zink",r->gpu("softpipe")));
        rejects("Explicit Zink retains failure cause","GPU process timed out after 12s",()->RendererSelection.select(manifest,"zink",r->{throw new IOException("GPU process timed out after 12s");}));
        rejects("Unknown preference does not become auto","不包含所选",()->RendererSelection.select(manifest,"unknown",r->gpu("Adreno 730")));
        rejects("No software candidate means an actionable failure","没有软件兼容",()->RendererSelection.select(new JSONArray().put(renderer("zink")),"auto",r->gpu("llvmpipe")));
        rejects("Empty manifest is rejected","没有可用",()->RendererSelection.select(new JSONArray(),"auto",r->gpu("Adreno 730")));

        JSONArray alternatives=new JSONArray().put(renderer("softpipe")).put(renderer("zink").put("id","broken-zink"))
                .put(renderer("zink").put("id","working-zink"));
        RendererSelection.Selection alternative=RendererSelection.select(alternatives,"auto",r->{
            if(r.getString("id").equals("broken-zink"))throw new IOException("driver load failed");
            return gpu("Zink (Adreno 740)");
        });
        check("Auto tries another GPU candidate before software",alternative.renderer.getString("id").equals("working-zink")&&!alternative.software);
        check("Earlier GPU failure remains in diagnostics",alternative.diagnostic.contains("broken-zink")&&alternative.diagnostic.contains("driver load failed"));

        JSONArray unsupported=new JSONArray().put(renderer("zink").put("kind","egl")).put(renderer("softpipe"));
        check("Unsupported backend is never sent to the OSMesa probe",RendererSelection.select(unsupported,"auto",r->{throw new AssertionError("Unsupported renderer probed");}).software);
        try {
            RendererSelection.select(manifest,"auto",r->{throw new InterruptedException("cancelled");});
            throw new AssertionError("Cancellation incorrectly fell back to software");
        } catch(InterruptedIOException expected) {
            check("Cancellation propagates and preserves interruption",Thread.currentThread().isInterrupted());
        } finally {Thread.interrupted();}
        System.out.println("Renderer selection: "+checks+" checks passed (JVM fixtures; no device/GPU execution)");
    }

    private static RendererSelection.ProbeResult gpu(String name) {
        return new RendererSelection.ProbeResult(true,name,"32x32 context passed");
    }

    private static void check(String name, boolean condition) {
        if(!condition)throw new AssertionError(name);
        checks++;
    }

    private interface Action {void run() throws Exception;}

    private static void rejects(String name, String reason, Action action) throws Exception {
        try {action.run();throw new AssertionError(name);}
        catch(IOException expected) {check(name,expected.getMessage()!=null&&expected.getMessage().contains(reason));}
    }
}
