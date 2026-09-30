package com.aithss.finance;

import android.Manifest;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.*;

@CapacitorPlugin(name = "ApkDownload", permissions = {
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class ApkDownloadPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private SharedPreferences prefs() { return ApkUpdateState.prefs(getContext()); }
    private DownloadManager manager() { return (DownloadManager)getContext().getSystemService(Context.DOWNLOAD_SERVICE); }

    @PluginMethod public void start(PluginCall call) {
        worker.execute(() -> {
            try {
                String url = call.getString("url", ""), version = call.getString("version", "");
                if (!version.matches("\\d+\\.\\d+\\.\\d+") || !url.matches("https://github\\.com/aiThss/finance/releases/download/v?\\d+\\.\\d+\\.\\d+/tui-nho\\.apk")
                        || !(url.endsWith("/v" + version + "/tui-nho.apk") || url.endsWith("/" + version + "/tui-nho.apk"))
                        || !ApkUpdateState.newer(version, ApkUpdateState.installed(getContext()).versionName)) {
                    call.reject("Bản cập nhật không hợp lệ."); return;
                }
                String state = status().getString("state");
                if (version.equals(prefs().getString("version", "")) && !"failed".equals(state) && !"idle".equals(state)) {
                    call.resolve(new JSObject().put("downloadId", Long.toString(prefs().getLong("downloadId", -1)))); return;
                }
                if ("installing".equals(state) || "pending_user_action".equals(state)) { call.reject("Đang cài bản cập nhật."); return; }
                ApkUpdateState.clear(getContext());
                File file = ApkUpdateState.file(getContext());
                if (!file.getParentFile().isDirectory() && !file.getParentFile().mkdirs()) throw new IOException();
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                        .setTitle("Heo Nhỏ · Đang tải cập nhật")
                        .setMimeType("application/vnd.android.package-archive")
                        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                        .setDestinationUri(Uri.fromFile(file));
                prefs().edit().putString("url", url).putString("version", version).putString("path", file.getAbsolutePath()).putString("state", "pending").commit();
                long id = manager().enqueue(request);
                prefs().edit().putLong("downloadId", id).commit();
                call.resolve(new JSObject().put("downloadId", Long.toString(id)));
            } catch (Exception e) {
                ApkUpdateState.state(getContext(), "failed", "Không bắt đầu tải được. Thử lại.");
                call.reject("Không bắt đầu tải được. Thử lại.");
            }
        });
    }

    private JSObject status() throws Exception {
        SharedPreferences p = prefs();
        if (ApkUpdateState.alreadyInstalled(getContext())) {
            ApkUpdateState.clear(getContext());
            return new JSObject().put("state", "installed");
        }
        String saved = p.getString("state", "idle");
        JSObject out = new JSObject().put("state", saved).put("version", p.getString("version", null)).put("url", p.getString("url", null)).put("reason", p.getString("reason", ""));
        if ("needs_permission".equals(saved)) {
            if (Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls()) {
                ApkUpdateState.state(getContext(), "downloaded", ""); out.put("state", "downloaded");
            }
            return out;
        }
        if ("installing".equals(saved)) {
            if (getContext().getPackageManager().getPackageInstaller().getSessionInfo(p.getInt("sessionId", -1)) == null) {
                ApkUpdateState.state(getContext(), "failed", "Cài đặt chưa hoàn tất. Thử lại.");
                out.put("state", "failed").put("reason", "Cài đặt chưa hoàn tất. Thử lại.");
            }
            return out;
        }
        if ("pending_user_action".equals(saved)) return out;
        if ("failed".equals(saved)) return out;
        long id = p.getLong("downloadId", -1);
        // Recover an enqueue interrupted before its ID could be persisted.
        if (id == -1 && p.contains("url")) {
            try (Cursor all = manager().query(new DownloadManager.Query())) {
                while (all != null && all.moveToNext()) {
                    if (p.getString("url", "").equals(all.getString(all.getColumnIndexOrThrow(DownloadManager.COLUMN_URI)))
                            && Uri.fromFile(ApkUpdateState.file(getContext())).toString().equals(all.getString(all.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI)))) {
                        id = all.getLong(all.getColumnIndexOrThrow(DownloadManager.COLUMN_ID)); p.edit().putLong("downloadId", id).commit(); break;
                    }
                }
            }
        }
        if (id == -1) return out.put("state", "idle");
        try (Cursor c = manager().query(new DownloadManager.Query().setFilterById(id))) {
            if (c == null || !c.moveToFirst()) {
                ApkUpdateState.state(getContext(), "failed", "Tệp cập nhật không còn. Tải lại.");
                return out.put("state", "failed").put("reason", "Tệp cập nhật không còn. Tải lại.");
            }
            String state = ApkUpdateState.downloadState(c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)));
            long downloaded = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            int reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
            String message = state.equals("paused") ? "Đang chờ mạng để tiếp tục." : state.equals("failed") ? "Tải chưa hoàn tất. Thử lại." : "";
            if (state.equals("downloaded")) {
                File file = ApkUpdateState.file(getContext());
                try {
                    if (!file.exists() || p.getLong("verifiedSize", -1) != file.length() || p.getLong("verifiedModified", -1) != file.lastModified()) {
                        ApkUpdateState.verify(getContext());
                        p.edit().putLong("verifiedSize", file.length()).putLong("verifiedModified", file.lastModified()).commit();
                    }
                } catch (Exception invalid) {
                    manager().remove(id); file.delete(); state = "failed"; message = "APK không hợp lệ. Tải lại.";
                }
            }
            if (!state.equals(saved)) ApkUpdateState.state(getContext(), state, message);
            out.put("state", state).put("reason", message).put("reasonCode", reason).put("downloadId", Long.toString(id))
                    .put("downloadedBytes", Math.max(0, downloaded)).put("totalBytes", Math.max(0, total));
            if (total > 0) out.put("percent", Math.max(0, Math.min(100, downloaded * 100.0 / total)));
            return out;
        }
    }
    @PluginMethod public void getStatus(PluginCall call) {
        worker.execute(() -> { try { call.resolve(status()); } catch (Exception e) { call.reject("Không đọc được trạng thái cập nhật."); } });
    }
    @PluginMethod public void clear(PluginCall call) {
        worker.execute(() -> {
            if ("installing".equals(prefs().getString("state", ""))) { call.reject("Đang cài bản cập nhật."); return; }
            ApkUpdateState.clear(getContext()); call.resolve();
        });
    }
    @PluginMethod public void install(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED && !prefs().getBoolean("askedNotifications", false)) {
            prefs().edit().putBoolean("askedNotifications", true).commit();
            requestPermissionForAlias("notifications", call, "notificationResult");
        } else installReady(call);
    }
    @PermissionCallback private void notificationResult(PluginCall call) { installReady(call); }
    private void installReady(PluginCall call) {
        worker.execute(() -> {
            try {
                String current = status().getString("state");
                if ("installing".equals(current) || "pending_user_action".equals(current)) {
                    call.resolve(new JSObject().put("state", "pending_user_action")); return;
                }
                ApkUpdateState.verify(getContext());
                if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                    ApkUpdateState.state(getContext(), "needs_permission", "Cho phép Heo Nhỏ cài cập nhật.");
                    getActivity().runOnUiThread(() -> {
                        try {
                            getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())));
                            call.resolve(new JSObject().put("state", "needs_permission"));
                        } catch (Exception e) { call.reject("Không mở được quyền cài đặt. Kiểm tra Cài đặt Android."); }
                    }); return;
                }
                File apk = ApkUpdateState.file(getContext());
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW)
                        .setDataAndType(uri, "application/vnd.android.package-archive");
                install.setClipData(ClipData.newRawUri("tui-nho.apk", uri));
                install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                ApkUpdateState.state(getContext(), "pending_user_action", "Xác nhận cài đặt trên Android.");
                getActivity().runOnUiThread(() -> {
                    try {
                        getActivity().startActivity(install);
                        call.resolve(new JSObject().put("state", "pending_user_action"));
                    } catch (Exception e) {
                        ApkUpdateState.state(getContext(), "failed", "Không mở được màn hình cài đặt. Thử lại.");
                        call.reject("Không mở được màn hình cài đặt. Thử lại.");
                    }
                });
            } catch (Exception e) {
                try { ApkUpdateState.verify(getContext()); } catch (Exception invalid) { ApkUpdateState.file(getContext()).delete(); }
                ApkUpdateState.state(getContext(), "failed", "Không cài được cập nhật. Thử lại.");
                call.reject("Không cài được cập nhật. Thử lại.");
            }
        });
    }
    @Override protected void handleOnDestroy() { worker.shutdown(); }
}
