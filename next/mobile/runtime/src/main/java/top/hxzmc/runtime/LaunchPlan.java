package top.hxzmc.runtime;

import java.io.File;
import java.util.*;

/** Immutable, tokenized command. No shell string and no credentials in toString(). */
public final class LaunchPlan {
    public final String versionId;
    public final int javaMajor;
    public final File gameDirectory, assetsDirectory, nativesDirectory;
    public final List<File> classpath;
    public final List<String> jvmArguments, gameArguments;
    public final String mainClass;
    LaunchPlan(String id, int javaMajor, File run, File assets, File natives, List<File> cp,
               String main, List<String> jvm, List<String> args) {
        versionId=id; this.javaMajor=javaMajor; gameDirectory=run; assetsDirectory=assets;
        nativesDirectory=natives; mainClass=main;
        classpath=Collections.unmodifiableList(new ArrayList<>(cp));
        jvmArguments=Collections.unmodifiableList(new ArrayList<>(jvm));
        gameArguments=Collections.unmodifiableList(new ArrayList<>(args));
    }
    public EngineHost.JavaJob javaJob() {
        return new EngineHost.JavaJob(javaMajor,mainClass,gameDirectory,classpath,jvmArguments,gameArguments);
    }
    /** Append prepared auth-agent/room tokens without rebuilding the installation plan. */
    public LaunchPlan withAdditionalArguments(List<String> jvm,List<String> game) {
        List<String> combinedJvm=new ArrayList<>(jvmArguments);combinedJvm.addAll(jvm);
        List<String> combinedGame=new ArrayList<>(gameArguments);combinedGame.addAll(game);
        return new LaunchPlan(versionId,javaMajor,gameDirectory,assetsDirectory,nativesDirectory,classpath,mainClass,combinedJvm,combinedGame);
    }
    @Override public String toString() { return "LaunchPlan("+versionId+", Java "+javaMajor+", "+classpath.size()+" classpath files)"; }
}
