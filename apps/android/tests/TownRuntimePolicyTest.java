package top.hxzmc.town;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public class TownRuntimePolicyTest {
    private static final String QUESTION = "_minecraft._tcp.world.example";

    private static byte[] response() throws IOException {
        ByteArrayOutputStream packet = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(packet);
        for (int value : new int[]{1, 0x8180, 1, 1, 0, 0}) out.writeShort(value);
        for (String label : QUESTION.split("\\.")) { out.writeByte(label.length()); out.writeBytes(label); }
        out.writeByte(0); out.writeShort(33); out.writeShort(1);
        out.writeShort(0xc00c); out.writeShort(33); out.writeShort(1); out.writeInt(300); out.writeShort(13);
        out.writeShort(5); out.writeShort(0); out.writeShort(25599);
        out.writeByte(4); out.writeBytes("game"); out.writeShort(0xc000 | 34);
        return packet.toByteArray();
    }

    private static void rejected(byte[] packet) {
        try { TownSrv.parse(packet, QUESTION); throw new AssertionError("Invalid record accepted"); }
        catch (IOException expected) { }
    }

    public static void main(String[] args) throws Exception {
        assert TownMemoryBudget.extraMiB(false, false, 2452, 7600, 3200, 220, 8192, 6500, false) == 0;
        assert TownMemoryBudget.extraMiB(true, false, 2452, 7600, 3200, 220, 8192, 6500, false) == 768;
        assert TownMemoryBudget.extraMiB(true, false, 2452, 7600, 640, 220, 8192, 6500, false) == 0;
        assert TownMemoryBudget.extraMiB(true, false, 2452, 7600, 3200, 220, 8192, 6500, true) == 0;
        assert TownMemoryBudget.extraMiB(true, false, 2452, 7600, 3200, 220, 8192, 2400, false) == 0;
        assert TownMemoryBudget.extraMiB(true, false, 2452, 7600, 3200, 220, 0, 6500, false) == 0;
        assert TownMemoryBudget.extraMiB(true, false, 8192, 16384, 9000, 220, 32768, 30000, false) == 1024;
        assert TownMemoryBudget.extraMiB(true, true, 2452, 7600, 3200, 220, 8192, 6500, false) == 1536;
        assert TownMemoryBudget.extraMiB(false, true, 2452, 7600, 3200, 220, 8192, 6500, false) == 0;
        assert TownMemoryBudget.extraMiB(true, true, 2452, 7600, 600, 220, 8192, 6500, false) == 0;
        assert TownMemoryBudget.extraMiB(true, true, 2452, 7600, 3200, 220, 8192, 2050, false) == 0;
        assert TownMemoryBudget.extraMiB(true, true, 8192, 16384, 9000, 220, 32768, 30000, false) == 2048;
        byte[] bytes = response();
        TownSrv srv = TownSrv.parse(bytes, QUESTION).get(0);
        assert srv.priority == 5 && srv.port == 25599 && srv.host.equals("game.example") : srv.host;
        rejected(Arrays.copyOf(bytes, bytes.length - 1));
        bytes[bytes.length - 1] = (byte) 255;
        rejected(bytes);
        Random random = new Random(12);
        TownSrv other = new TownSrv(6, 500, 1, "unused");
        TownSrv weighted = new TownSrv(5, 2, 2, "primary");
        assert TownSrv.choose(List.of(other, srv, weighted), random) == weighted;
        assert TownSrv.choose(List.of(), random) == null;
        assert TownSrv.choose(List.of(new TownSrv(1, 0, 0, ".")), random).host.equals(".");
        Path temp = Files.createTempDirectory("town-jei");
        Path dir = Files.createDirectories(temp.resolve("config/jei"));
        Path config = dir.resolve("jei-client.ini");
        try {
            TownItemSearch search = new TownItemSearch(temp.toFile());
            assert search.enabled() == null;
            String original = "[advanced]\r\r\n\tlowMemorySlowSearchEnabled = false\r\r\nother = 保留\r\n";
            Files.writeString(config, original);
            assert Boolean.FALSE.equals(search.enabled());
            search.save(true);
            assert Boolean.TRUE.equals(search.enabled());
            search.save(false);
            assert original.equals(Files.readString(config));
        } finally { Files.deleteIfExists(config); Files.delete(dir); Files.delete(dir.getParent()); Files.delete(temp); }
        System.out.println("Android memory budget and Minecraft SRV policy passed");
    }
}
