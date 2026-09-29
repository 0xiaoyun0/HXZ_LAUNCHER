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
        Object previous = null;
        AtomicBoolean pending = new AtomicBoolean(false);
        boolean warned = false;
        while (true) {
            try {
                Thread.sleep(2000);
                if (!control.isFile() || System.currentTimeMillis() - control.lastModified() > 35000) continue;
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
                if (server == previous || !pending.compareAndSet(false, true)) continue;
                final Object world = server;
                final int target = port;
                previous = server;
                ((Executor)client).execute(() -> {
                    try {
                        Method publish = null;
                        for (Method method : world.getClass().getMethods()) {
                            Class<?>[] args = method.getParameterTypes();
                            if (method.getReturnType() == boolean.class && args.length == 3 && args[0].isEnum() && args[1] == boolean.class && args[2] == int.class) { publish = method; break; }
                        }
                        if (publish == null) throw new IllegalStateException("This game version has no supported LAN publish method");
                        publish.setAccessible(true);
                        // Preserve the world's game mode; joining players do not receive cheats.
                        boolean opened = Boolean.TRUE.equals(publish.invoke(world, null, false, target));
                        System.out.println(opened ? "[HXZ-DIRECT] READY " + target : "[HXZ-DIRECT] ERROR World could not open; it may already be open to LAN");
                    } catch (Throwable error) {
                        System.out.println("[HXZ-DIRECT] ERROR " + error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage()));
                    } finally { pending.set(false); }
                });
            } catch (InterruptedException stopped) { return; }
            catch (Throwable error) {
                if (!warned) { System.out.println("[HXZ-DIRECT] ERROR " + error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage())); warned = true; }
            }
        }
    }
}
