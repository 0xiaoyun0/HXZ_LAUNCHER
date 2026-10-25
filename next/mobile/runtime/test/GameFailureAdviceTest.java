import top.hxzmc.runtime.GameFailureAdvice;

public final class GameFailureAdviceTest {
    public static void main(String[] args) {
        check("It appears that you are using PojavLauncher, which is not supported when using Sodium. Please check your mods list.","Sodium");
        check("Caused by: java.lang.OutOfMemoryError: Java heap space","内存不足");
        check("java.lang.UnsatisfiedLinkError: dlopen failed: EM_X86_64 instead of EM_AARCH64","电脑架构");
        check("GLFW error 65542: driver","图形驱动");
        check("java.lang.UnsupportedClassVersionError: class file 69","Java 版本");
        check("Failed to verify username!","账号验证");
        check("Failed to synchronize registry data from server","模组或注册数据");
        check("HXZ IPC: Shared frame descriptor is too small","画面通道");
        check("Cannot query Android shared frame buffer size","画面通道");
        check("Shared frame buffer is too small: required=128, actual=64","画面通道");
        check("Could not find agent library instrument on the library path, with error: dlopen failed: library \"libinstrument.so\" not found","登录验证组件");
        check("HXZ: Cannot load runtime library: libjli.so not found","登录验证组件");
        check("java.lang.UnsatisfiedLinkError: /app_runtime/java/21/lib/libfontmanager.so: dlopen failed: library \"libfreetype.so\" not found: needed by libfontmanager.so in namespace clns-9","字体组件");
        check("HXZ: Cannot load runtime library: /app_runtime/java/25/lib/libawt_headless.so: missing dependency","字体组件");
        check("java.lang.NoClassDefFoundError: Could not initialize class org.lwjgl.util.freetype.FreeType$Functions","完整字体库");
        check("java.lang.NullPointerException: A required function is missing: FT_Get_Transform","完整字体库");
        check("java.lang.NullPointerException: UI recording context has not been created yet, or creation failed\n at icyllis.modernui.core.Core.requireUiRecordingContext(Core.java:582)","ModernUI");
        if(!GameFailureAdvice.explain("Unrelated UI recording context has not been created").isEmpty())throw new AssertionError("Unrelated UI library misclassified");
        if(!GameFailureAdvice.explain("ModernUI font loaded with libfreetype.so").isEmpty())throw new AssertionError("Successful font initialization misclassified");
        if(!GameFailureAdvice.explain("Missing optional language file; update available").isEmpty())throw new AssertionError("Benign output misclassified");
        if(!GameFailureAdvice.explain("Process exit 137").isEmpty())throw new AssertionError("Exit code alone is not memory evidence");
        if(!GameFailureAdvice.explain("Process exit 66").isEmpty())throw new AssertionError("Exit code alone is not shared memory evidence");
        if(!GameFailureAdvice.explain(null).isEmpty())throw new AssertionError("null evidence");
        System.out.println("Game failure advice: 23 checks passed");
    }
    private static void check(String input,String expected) {if(!GameFailureAdvice.explain(input).contains(expected))throw new AssertionError(input);}
}
