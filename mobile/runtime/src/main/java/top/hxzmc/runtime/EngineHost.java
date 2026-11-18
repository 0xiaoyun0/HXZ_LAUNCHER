package top.hxzmc.runtime;

import java.io.File;
import java.util.*;
import java.util.concurrent.CancellationException;

/** Platform boundary. Implementations must wait for actual JVM exit and honor cancellation. */
public interface EngineHost {
    int runJava(JavaJob job, Cancellation cancellation, Progress progress) throws Exception;

    final class Cancellation {
        private volatile boolean cancelled;
        private final Cancellation parent;
        public Cancellation() {parent=null;}
        public Cancellation(Cancellation parent) {this.parent=parent;}
        public void cancel() { cancelled = true; }
        public boolean isCancelled() { return cancelled || (parent!=null&&parent.isCancelled()) || Thread.currentThread().isInterrupted(); }
        public void check() { if (isCancelled()) throw new CancellationException("Operation cancelled"); }
    }
    interface Progress {
        void update(String phase, String item, long completed, long total);
    }
    final class JavaJob {
        public final int javaMajor;
        public final String mainClass;
        public final File workingDirectory;
        public final List<File> classpath;
        public final List<String> jvmArguments, arguments;
        public JavaJob(int javaMajor, String mainClass, File work, List<File> cp,
                       List<String> jvm, List<String> args) {
            if (javaMajor < 8 || mainClass == null || !mainClass.matches("[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*"))
                throw new IllegalArgumentException("Invalid Java job");
            this.javaMajor = javaMajor; this.mainClass = mainClass; workingDirectory = work;
            classpath = Collections.unmodifiableList(new ArrayList<>(cp));
            jvmArguments = Collections.unmodifiableList(new ArrayList<>(jvm));
            arguments = Collections.unmodifiableList(new ArrayList<>(args));
        }
    }
}
