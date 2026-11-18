package com.tungsten.fcl.hxz;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import com.tungsten.fcl.setting.Accounts;
import com.tungsten.fclcore.auth.Account;
import com.tungsten.fclcore.auth.authlibinjector.AuthlibInjectorAccount;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

/** Also covers first launch from the engine's own app icon, after FCL has initialized Accounts. */
public final class HxzCommunityAccounts {
    private static final AtomicBoolean syncing = new AtomicBoolean();
    private static volatile long lastAttempt;
    public static void sync(Activity activity) {
        if (activity.isFinishing() || activity.isDestroyed() || HxzRunner.isBusy()
                || SystemClock.elapsedRealtime() - lastAttempt < 3000 || !syncing.compareAndSet(false, true)) return;
        lastAttempt = SystemClock.elapsedRealtime();
        new Thread(() -> {
            boolean posted = false;
            try {
                if (activity.getPackageManager().checkSignatures(activity.getPackageName(), "top.hxzmc.community") != PackageManager.SIGNATURE_MATCH) return;
                Bundle response = activity.getContentResolver().call(Uri.parse("content://top.hxzmc.community.game-account"), "selectedAccount", null, null);
                String raw = response == null ? null : response.getString("account");
                if (raw == null) return;
                JSONObject selected = new JSONObject(raw);
                String fingerprint = android.util.Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)), android.util.Base64.NO_WRAP);
                posted = true;activity.runOnUiThread(() -> {
                    try {
                        if (activity.isFinishing() || activity.isDestroyed() || HxzRunner.isBusy()) return;
                        SharedPreferences prefs = activity.getSharedPreferences("hxz-community-account", 0);
                        if (fingerprint.equals(prefs.getString("imported", ""))) {
                            String uuid = selected.optString("uuid").replace("-", "");
                            for (Account account : Accounts.getAccounts()) {
                                if (account instanceof AuthlibInjectorAccount && account.getUUID().toString().replace("-", "").equalsIgnoreCase(uuid)
                                        && HxzAccounts.SKIN.equals(((AuthlibInjectorAccount) account).getServer().getUrl().replaceAll("/+$", "") + "/")) return;
                            }
                        }
                        HxzAccounts.install(selected);
                        prefs.edit().putString("imported", fingerprint).apply();
                        HxzRunner.record(activity, "已自动同步社区皮肤站角色");
                        android.widget.Toast.makeText(activity, "已导入社区皮肤站角色：" + selected.optString("name"), android.widget.Toast.LENGTH_SHORT).show();
                    } catch (Exception e) {
                        HxzRunner.record(activity, "社区账号导入未完成，请返回社区重新登录并打开运行组件");
                    } finally { syncing.set(false); }
                });
                return;
            } catch (Exception e) {
                // An older community APK has no provider. Existing FCL accounts remain usable.
                HxzRunner.record(activity, "社区账号自动同步暂不可用，请更新社区客户端后重试");
            } finally { if (!posted) syncing.set(false); }
        }, "hxz-community-account").start();
    }
}
