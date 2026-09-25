package com.aithss.finance;

import android.app.*;
import android.content.*;
import android.content.pm.PackageInstaller;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class UpdateInstallReceiver extends BroadcastReceiver {
    static final String ACTION_RESULT = "com.aithss.finance.UPDATE_RESULT";
    static final String CHANNEL = "apk-updates";
    static final int NOTICE = 819;
    static Intent confirmation(Context c) { return new Intent(c, UpdateConfirmationActivity.class).setAction("com.aithss.finance.CONFIRM_UPDATE"); }
    static boolean resumeConfirmation(Context c) {
        PendingIntent pending = PendingIntent.getActivity(c, NOTICE, confirmation(c), PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pending == null) return false;
        try { pending.send(); return true; } catch (PendingIntent.CanceledException e) { return false; }
    }
    static void cancelNotification(Context c) { NotificationManagerCompat.from(c).cancel(NOTICE); }
    static void notify(Context c, String text, PendingIntent action) {
        NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Cập nhật Heo Nhỏ", NotificationManager.IMPORTANCE_DEFAULT));
        try {
            NotificationManagerCompat.from(c).notify(NOTICE, new NotificationCompat.Builder(c, CHANNEL)
                    .setSmallIcon(R.drawable.ic_update_notification).setContentTitle("Heo Nhỏ")
                    .setContentText(text).setContentIntent(action).setAutoCancel(true).build());
        } catch (SecurityException ignored) { /* Notification permission can be declined; foreground UI still works. */ }
    }
    static String failure(int status) {
        switch (status) {
            case PackageInstaller.STATUS_FAILURE_ABORTED: return "Đã hủy cài đặt. Bạn có thể thử lại.";
            case PackageInstaller.STATUS_FAILURE_BLOCKED: return "Android chặn cài đặt. Kiểm tra quyền hoặc bước quét APK.";
            case PackageInstaller.STATUS_FAILURE_CONFLICT: return "Bản cài đặt không khớp ứng dụng hiện tại.";
            case PackageInstaller.STATUS_FAILURE_INCOMPATIBLE: return "Bản cập nhật không tương thích thiết bị.";
            case PackageInstaller.STATUS_FAILURE_INVALID: return "APK không hợp lệ. Tải lại.";
            case PackageInstaller.STATUS_FAILURE_STORAGE: return "Không đủ dung lượng để cài cập nhật.";
            case PackageInstaller.STATUS_FAILURE_TIMEOUT: return "Cài đặt quá thời gian. Thử lại.";
            default: return "Không cài được cập nhật. Thử lại.";
        }
    }
    @Override public void onReceive(Context c, Intent intent) {
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            ApkUpdateState.clear(c);
            ApkUpdateState.state(c, "installed", "");
            Intent launch = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent open = PendingIntent.getActivity(c, NOTICE + 1, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            // A replacement normally kills the old process. Respect background launch restrictions.
            if (MainActivity.foreground) { try { c.startActivity(launch); return; } catch (Exception ignored) { } }
            notify(c, "Heo Nhỏ đã được cập nhật · Mở ứng dụng", open);
            return;
        }
        if (!ACTION_RESULT.equals(intent.getAction())) return;
        int session = intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1);
        if (session != ApkUpdateState.prefs(c).getInt("sessionId", -2)) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent system = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (system == null) { ApkUpdateState.state(c, "failed", "Không mở được xác nhận cài đặt."); return; }
            Intent activity = confirmation(c).putExtra(Intent.EXTRA_INTENT, system).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent action = PendingIntent.getActivity(c, NOTICE, activity, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            ApkUpdateState.state(c, "pending_user_action", "Xác nhận cài đặt trên Android.");
            if (MainActivity.foreground) {
                try { c.startActivity(activity); return; } catch (Exception ignored) { }
            }
            // Notification directly opens an Activity, never a broadcast/service trampoline.
            notify(c, "Chạm để xác nhận cài cập nhật", action);
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            ApkUpdateState.clear(c);
            ApkUpdateState.state(c, "installed", "");
        } else {
            cancelNotification(c);
            if (status == PackageInstaller.STATUS_FAILURE_INVALID || status == PackageInstaller.STATUS_FAILURE_CONFLICT) ApkUpdateState.file(c).delete();
            ApkUpdateState.state(c, "failed", failure(status));
        }
    }
}
