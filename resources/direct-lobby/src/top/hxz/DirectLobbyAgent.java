package top.hxz;

import java.io.*;
import java.lang.instrument.Instrumentation;
import java.lang.reflect.*;
import java.util.*;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

/** Opens only the current integrated world, on Minecraft's client thread. */
public final class DirectLobbyAgent {
    public static void premain(String ignored, final Instrumentation instrumentation) {
        Thread worker = new Thread(() -> watch(instrumentation), "HXZ-direct-lobby");
        worker.setDaemon(true);
        worker.start();
    }
    private static void watch(Instrumentation instrumentation) {
        File control = new File(".hxzl/direct-lobby.properties");
        Class<?> clientClass = null;
        Attempt previous = null;
        AtomicBoolean pending = new AtomicBoolean(false);
        boolean warned = false;
        while (true) {
            try {
                Thread.sleep(2000);
                if (!control.isFile() || System.currentTimeMillis() - control.lastModified() > 35000) { previous = null; continue; }
                Properties settings = new Properties();
                try (InputStream stream = new FileInputStream(control)) { settings.load(stream); }
                int port = Integer.parseInt(settings.getProperty("port"));
                if (port < 1 || port > 65535) continue;
                if (clientClass == null) {
                    Set<String> names = new HashSet<>(Arrays.asList("net.minecraft.client.Minecraft", "net.minecraft.client.MinecraftClient", "net.minecraft.class_310", settings.getProperty("clientClass", "")));
                    for (Class<?> candidate : instrumentation.getAllLoadedClasses()) if (names.contains(candidate.getName())) { clientClass = candidate; break; }
                    if (clientClass == null) continue;
                }
                Object client = null;
                for (Method method : clientClass.getDeclaredMethods()) {
                    if (Modifier.isStatic(method.getModifiers()) && method.getParameterTypes().length == 0 && method.getReturnType() == clientClass) {
                        method.setAccessible(true); client = method.invoke(null); break;
                    }
                }
                if (!(client instanceof Executor)) continue;
                Object server = null;
                for (Field field : clientClass.getDeclaredFields()) {
                    String type = field.getType().getName();
                    if (type.equals(settings.getProperty("serverClass")) || type.equals("net.minecraft.client.server.IntegratedServer") || type.equals("net.minecraft.server.integrated.IntegratedServer") || type.equals("net.minecraft.class_1132")) {
                        field.setAccessible(true); server = field.get(client); break;
                    }
                }
                if (server == null) {
                    if (previous != null) System.out.println("[HXZ-DIRECT] WAITING");
                    previous = null; continue;
                }
                if (previous == null || previous.world != server || previous.port != port) previous = new Attempt(server, port);
                if (previous.opened || System.currentTimeMillis() < previous.retryAt || !pending.compareAndSet(false, true)) continue;
                final Object world = server;
                final int target = port;
                final Attempt attempt = previous;
                ((Executor)client).execute(() -> {
                    try {
                        // A cancelled room must not open a world after an enqueued client task resumes.
                        Properties current = new Properties();
                        if (!control.isFile() || System.currentTimeMillis() - control.lastModified() > 35000) return;
                        try (InputStream stream = new FileInputStream(control)) { current.load(stream); }
                        if (!String.valueOf(target).equals(current.getProperty("port"))) return;
                        if (!publishWorld(world, target)) throw new IOException("World could not open its LAN port; re-enter the singleplayer world and retry");
                        attempt.opened = true;
                        System.out.println("[HXZ-DIRECT] READY " + target);
                    } catch (Throwable error) {
                        while (error instanceof InvocationTargetException && error.getCause() != null) error = error.getCause();
                        attempt.failures++;
                        attempt.retryAt = System.currentTimeMillis() + Math.min(30000, 2000L << Math.min(4, attempt.failures));
                        String detail = error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage());
                        if (!detail.equals(attempt.lastError)) { System.out.println("[HXZ-DIRECT] ERROR " + detail); attempt.lastError = detail; }
                    } finally { pending.set(false); }
                });
            } catch (InterruptedException stopped) { return; }
            catch (Throwable error) {
                if (!warned) { System.out.println("[HXZ-DIRECT] ERROR " + error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage())); warned = true; }
            }
        }
    }

    private static final class Attempt {
        final Object world; final int port;
        volatile boolean opened; volatile long retryAt; int failures; String lastError = "";
        Attempt(Object world, int port) { this.world = world; this.port = port; }
    }

    static boolean publishWorld(Object world, int port) throws Exception {
        // Named status access is available in recent unobfuscated versions. Already-open worlds
        // must not be reported ready for a different port than the launcher's local tunnel.
        try {
            Method published = world.getClass().getMethod("isPublished");
            if (Boolean.TRUE.equals(published.invoke(world))) {
                int actual = ((Number)world.getClass().getMethod("getPort").invoke(world)).intValue();
                if (actual == port) return true;
                throw new IOException("World is already open on port " + actual + "; re-enter singleplayer before opening a new room");
            }
        } catch (NoSuchMethodException unsupportedStatus) { /* Legacy mapped names are handled by the publish signature. */ }
        Method legacy = null;
        for (Method method : world.getClass().getMethods()) {
            Class<?>[] args = method.getParameterTypes();
            if (Modifier.isStatic(method.getModifiers()) || method.getReturnType() != boolean.class) continue;
            if (args.length == 4 && args[0].isEnum() && args[1].isEnum() && args[2] == boolean.class && args[3] == int.class) {
                Object lan = null;
                for (Object value : args[0].getEnumConstants()) if (((Enum<?>)value).name().equals("LAN")) lan = value;
                if (lan != null) {
                    method.setAccessible(true);
                    // 26.2: explicit multiplayer scope, unchanged game mode, no guest cheats.
                    return Boolean.TRUE.equals(method.invoke(world, lan, null, false, port));
                }
            }
            if (args.length == 3 && args[0].isEnum() && args[1] == boolean.class && args[2] == int.class) legacy = method;
        }
        if (legacy != null) { legacy.setAccessible(true); return Boolean.TRUE.equals(legacy.invoke(world, null, false, port)); }
        throw new IllegalStateException("Unsupported LAN publish API in " + world.getClass().getName());
    }
}
