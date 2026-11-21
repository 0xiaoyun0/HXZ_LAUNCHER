package top.hxzmc.town;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/** Minecraft SRV answers from Android's DNS resolver, including compressed wire names. */
final class TownSrv {
    final int priority, weight, port;
    final String host;

    TownSrv(int priority, int weight, int port, String host) {
        this.priority = priority;
        this.weight = weight;
        this.port = port;
        this.host = host;
    }

    private static int word(byte[] packet, int at) throws IOException {
        if (at < 0 || at + 2 > packet.length) throw new IOException("Incomplete DNS response");
        return (packet[at] & 255) << 8 | packet[at + 1] & 255;
    }

    private static String name(byte[] packet, int[] cursor) throws IOException {
        int at = cursor[0];
        boolean indirect = false;
        StringBuilder result = new StringBuilder();
        for (int labels = 0; labels < 128 && at < packet.length; labels++) {
            int size = packet[at++] & 255;
            if (size == 0) {
                if (!indirect) cursor[0] = at;
                return result.length() == 0 ? "." : result.toString();
            }
            if ((size & 192) == 192 && at < packet.length) {
                int pointer = ((size & 63) << 8) | (packet[at] & 255);
                if (pointer >= at - 1) throw new IOException("Invalid DNS name");
                if (!indirect) cursor[0] = at + 1;
                indirect = true;
                at = pointer;
                continue;
            }
            if (size > 63 || at + size > packet.length || result.length() + size > 253) throw new IOException("Invalid DNS label");
            if (result.length() > 0) result.append('.');
            for (int i = 0; i < size; i++) {
                int ch = packet[at++] & 255;
                if (!(ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' || ch == '-' || ch == '_')) throw new IOException("Invalid DNS label");
                result.append((char) ch);
            }
        }
        throw new IOException("Unterminated DNS name");
    }

    static List<TownSrv> parse(byte[] packet, String question) throws IOException {
        List<TownSrv> records = new ArrayList<>();
        int flags = word(packet, 2);
        if ((flags & 0x820f) != 0x8000 || word(packet, 4) != 1) throw new IOException("Invalid SRV response");
        int answers = word(packet, 6);
        int[] next = {12};
        if (!name(packet, next).equalsIgnoreCase(question) || word(packet, next[0]) != 33 || word(packet, next[0] + 2) != 1)
            throw new IOException("Unexpected DNS question");
        next[0] += 4;
        for (int i = 0; i < answers; i++) {
            String owner = name(packet, next);
            int head = next[0], start = head + 10;
            int end = start + word(packet, head + 8);
            if (end > packet.length) throw new IOException("Incomplete SRV answer");
            if (owner.equalsIgnoreCase(question) && word(packet, head) == 33 && word(packet, head + 2) == 1) {
                next[0] = start + 6;
                String host = name(packet, next);
                if (next[0] != end) throw new IOException("Invalid SRV record");
                records.add(new TownSrv(word(packet, start), word(packet, start + 2), word(packet, start + 4), host));
            }
            next[0] = end;
        }
        return records;
    }

    static TownSrv choose(List<TownSrv> records, Random random) {
        int best = Integer.MAX_VALUE;
        List<TownSrv> choices = new ArrayList<>();
        for (TownSrv r : records) {
            if (!(r.host.equals(".") || r.port > 0 && r.port <= 65535) || r.priority > best) continue;
            if (r.priority < best) { best = r.priority; choices.clear(); }
            choices.add(r);
        }
        if (choices.isEmpty()) return null;
        int total = 0;
        for (TownSrv r : choices) total += r.weight;
        if (total == 0) return choices.get(random.nextInt(choices.size()));
        int draw = random.nextInt(total);
        for (TownSrv r : choices) { draw -= r.weight; if (draw < 0) return r; }
        throw new IllegalStateException();
    }
}
