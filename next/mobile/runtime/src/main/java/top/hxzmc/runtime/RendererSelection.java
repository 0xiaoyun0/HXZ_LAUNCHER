package top.hxzmc.runtime;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CancellationException;
import org.json.JSONArray;
import org.json.JSONObject;

/** Selects from a verified module manifest without changing the saved preference. */
public final class RendererSelection {
    private RendererSelection() {}

    @FunctionalInterface
    public interface Probe {
        ProbeResult probe(JSONObject renderer) throws Exception;
    }

    public static final class ProbeResult {
        /** True only after the requested desktop OpenGL 3.3 context was created successfully. */
        public final boolean openGl33;
        public final String glRenderer, diagnostic;

        public ProbeResult(boolean openGl33, String glRenderer, String diagnostic) {
            this.openGl33=openGl33;
            this.glRenderer=glRenderer==null?"":glRenderer.trim();
            this.diagnostic=diagnostic==null?"":diagnostic.trim();
        }
    }

    public static final class Selection {
        public final JSONObject renderer;
        public final String diagnostic;
        public final boolean software;

        private Selection(JSONObject renderer, String diagnostic, boolean software) {
            this.renderer=renderer;this.diagnostic=diagnostic;this.software=software;
        }
    }

    /** The caller owns native process isolation, timeout and module/library verification. */
    public static Selection select(JSONArray renderers, String selected, Probe probe) throws IOException {
        if(renderers==null||renderers.length()==0)throw new IOException("运行模块没有可用的图形驱动，请更新运行模块");
        String requested=selected==null||selected.trim().isEmpty()?"auto":selected.trim();
        boolean automatic=requested.equals("auto");
        JSONObject software=null;
        List<JSONObject> candidates=new ArrayList<>();
        for(int i=0;i<renderers.length();i++) {
            JSONObject item=renderers.optJSONObject(i);
            if(item==null||!item.optString("kind").equals("osmesa"))continue;
            String driver=item.optString("driver");
            if(!driver.equals("zink")&&!driver.equals("softpipe"))continue;
            if(automatic) {
                if(driver.equals("zink"))candidates.add(item);
                else if(software==null)software=item;
            } else if(item.optString("id").equals(requested)) {
                if(driver.equals("softpipe"))return new Selection(item,"已按用户选择使用软件兼容渲染（softpipe）",true);
                candidates.add(item);
                break;
            }
        }
        if(!automatic&&candidates.isEmpty())throw new IOException("运行模块不包含所选渲染器："+requested);
        List<String> failures=new ArrayList<>();
        for(JSONObject candidate:candidates) {
            String label=candidate.optString("id","zink");
            ProbeResult result;
            try {
                if(probe==null)throw new IOException("GPU 探测器不可用");
                result=probe.probe(candidate);
            } catch(InterruptedException e) {
                Thread.currentThread().interrupt();
                InterruptedIOException interrupted=new InterruptedIOException("图形驱动探测已取消");
                interrupted.initCause(e);throw interrupted;
            } catch(InterruptedIOException e) {
                throw e;
            } catch(CancellationException e) {
                throw e;
            } catch(Exception e) {
                failures.add(label+"："+reason(e));continue;
            }
            String failure=invalidProbe(result);
            if(failure.isEmpty()) {
                String details="已确认 GPU 渲染（"+result.glRenderer+"），OpenGL 3.3 上下文可用";
                if(!result.diagnostic.isEmpty())details+="；"+result.diagnostic;
                if(!failures.isEmpty())details=String.join("\n",failures)+"\n"+details;
                return new Selection(candidate,details,false);
            }
            failures.add(label+"："+failure);
        }
        String details=failures.isEmpty()?"运行模块没有 Zink GPU 渲染器":String.join("\n",failures);
        if(!automatic)throw new IOException("所选 GPU 渲染器不可用，未更改用户选择。"+details);
        if(software==null)throw new IOException("GPU 渲染探测失败，运行模块没有软件兼容渲染器。"+details);
        return new Selection(software,details+"\n本次回退软件兼容渲染（softpipe），自动选择设置保持不变",true);
    }

    private static String invalidProbe(ProbeResult result) {
        if(result==null)return "GPU 探测没有返回结果";
        String issue;
        if(!result.openGl33)issue="无法创建 OpenGL 3.3 上下文";
        else if(result.glRenderer.isEmpty())issue="GPU 探测缺少 GL_RENDERER";
        else {
            String renderer=result.glRenderer.toLowerCase(Locale.ROOT);
            if(renderer.contains("softpipe")||renderer.contains("llvmpipe")||renderer.contains("lavapipe")
                    ||renderer.contains("swiftshader")||renderer.matches("(?s).*software[\\s_-]*rasteri[sz]er.*"))
                issue="实际为软件模拟渲染（"+result.glRenderer+"）";
            else return "";
        }
        return result.diagnostic.isEmpty()?issue:issue+"；"+result.diagnostic;
    }

    private static String reason(Exception error) {
        String message=error.getMessage();
        return message==null||message.trim().isEmpty()?error.getClass().getSimpleName():message.trim();
    }
}
