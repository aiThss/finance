package com.aithss.finance;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ApkDownload")
public class ApkDownloadPlugin extends Plugin {
    @PluginMethod
    public synchronized void start(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.matches("https://github\\.com/aiThss/finance/releases/download/v?\\d+\\.\\d+\\.\\d+/tui-nho\\.apk")) {
            call.reject("Đường dẫn APK không hợp lệ.");
            return;
        }
        try {
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("DownloadManager unavailable");
            // Reuse an active download, including after the app has restarted.
            try (Cursor cursor = manager.query(new DownloadManager.Query().setFilterByStatus(
                    DownloadManager.STATUS_PENDING | DownloadManager.STATUS_RUNNING | DownloadManager.STATUS_PAUSED))) {
                while (cursor != null && cursor.moveToNext()) {
                    if (url.equals(cursor.getString(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_URI)))) {
                        resolveDownload(call, cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_ID)));
                        return;
                    }
                }
            }
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                    .setTitle("Túi Nhỏ · Cập nhật APK")
                    .setDescription("Chạm để cài đặt khi tải xong")
                    .setMimeType("application/vnd.android.package-archive")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            // Before Android 10, let DownloadManager choose its managed storage
            // so downloading does not require legacy storage permission.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                        "tui-nho-" + System.currentTimeMillis() + ".apk");
            }
            resolveDownload(call, manager.enqueue(request));
        } catch (Exception error) {
            call.reject("Không thể bắt đầu tải APK. Kiểm tra trình tải xuống của Android rồi thử lại.", error);
        }
    }

    private void resolveDownload(PluginCall call, long id) {
        JSObject result = new JSObject();
        result.put("downloadId", Long.toString(id));
        call.resolve(result);
    }
}
