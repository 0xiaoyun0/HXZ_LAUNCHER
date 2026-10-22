import top.hxzmc.runtime.GameFailureAdvice;

public final class GameFailureAdviceTest {
    public static void main(String[] args) {
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
        if(!GameFailureAdvice.explain("Missing optional language file; update available").isEmpty())throw new AssertionError("Benign output misclassified");
        if(!GameFailureAdvice.explain("Process exit 137").isEmpty())throw new AssertionError("Exit code alone is not memory evidence");
        if(!GameFailureAdvice.explain("Process exit 66").isEmpty())throw new AssertionError("Exit code alone is not shared memory evidence");
        if(!GameFailureAdvice.explain(null).isEmpty())throw new AssertionError("null evidence");
        System.out.println("Game failure advice: 15 checks passed");
    }
    private static void check(String input,String expected) {if(!GameFailureAdvice.explain(input).contains(expected))throw new AssertionError(input);}
}
