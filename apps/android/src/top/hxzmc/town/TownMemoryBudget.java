package top.hxzmc.town;

/** MiB throughout. Only unreserved, currently free system swap can raise the normal game budget. */
public final class TownMemoryBudget {
    private TownMemoryBudget() {}
    public static int extraMiB(boolean enabled, boolean large, int base, long ram, long available, long threshold,
                               long swap, long swapFree, boolean lowMemory) {
        if (!enabled || base <= 0 || ram <= 0 || lowMemory || available < Math.max(768, threshold * 2)) return 0;
        long spare = Math.max(0, Math.min(swap, swapFree) - Math.max(512, swap / 4));
        long standard = Math.min(Math.min(spare / 4, ram / 8), Math.min(1024, base / 3));
        long amount = standard;
        if (large) {
            long physicalHeadroom = Math.max(0, available - Math.max(1024, threshold * 3));
            long allowance = Math.min(Math.min(spare / 2, ram / 4), Math.min(2048, base * 2L / 3));
            amount = Math.max(standard, Math.min(physicalHeadroom, allowance));
        }
        return (int) (amount / 128 * 128);
    }
}
