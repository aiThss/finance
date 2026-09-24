package com.aithss.finance;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import java.io.File;
import java.util.Arrays;
import java.util.HashSet;

/** Owns only update metadata and files, never finance data. */
final class ApkUpdateState {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("apk-update", Context.MODE_PRIVATE); }
    static File file(Context c) { return new File(c.getExternalFilesDir(null), "updates/tui-nho.apk"); }
    static void state(Context c, String state, String reason) {
        prefs(c).edit().putString("state", state).putString("reason", reason).commit();
    }
    static void clear(Context c) {
        SharedPreferences p = prefs(c);
        long id = p.getLong("downloadId", -1);
        if (id != -1) ((DownloadManager)c.getSystemService(Context.DOWNLOAD_SERVICE)).remove(id);
        int session = p.getInt("sessionId", -1);
        if (session != -1) try { c.getPackageManager().getPackageInstaller().abandonSession(session); } catch (Exception ignored) { }
        file(c).delete();
        p.edit().clear().commit();
        UpdateInstallReceiver.cancelNotification(c);
    }
    static long code(PackageInfo i) { return Build.VERSION.SDK_INT >= 28 ? i.getLongVersionCode() : i.versionCode; }
    static Signature[] signatures(PackageInfo i) {
        return Build.VERSION.SDK_INT >= 28 ? (i.signingInfo == null ? null : i.signingInfo.getApkContentsSigners()) : i.signatures;
    }
    static boolean newer(String remote, String current) {
        if (remote == null || current == null || !remote.matches("\\d+\\.\\d+\\.\\d+") || !current.matches("\\d+\\.\\d+\\.\\d+")) return false;
        String[] a = remote.split("\\."), b = current.split("\\.");
        for (int i = 0; i < 3; i++) {
            int n = new java.math.BigInteger(a[i]).compareTo(new java.math.BigInteger(b[i]));
            if (n != 0) return n > 0;
        }
        return false;
    }
    static PackageInfo installed(Context c) throws Exception { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0); }
    static boolean alreadyInstalled(Context c) throws Exception {
        String version = prefs(c).getString("version", null);
        return version != null && !newer(version, installed(c).versionName);
    }
    static void verify(Context c) throws Exception {
        File apk = file(c);
        if (!apk.isFile() || apk.length() <= 0) throw new Exception("missing APK");
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageManager pm = c.getPackageManager();
        PackageInfo archive = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        PackageInfo current = pm.getPackageInfo(c.getPackageName(), flags);
        if (archive == null || !c.getPackageName().equals(archive.packageName)
                || !prefs(c).getString("version", "").equals(archive.versionName)
                || code(archive) <= code(current) || !newer(archive.versionName, current.versionName)) throw new Exception("wrong package/version");
        Signature[] a = signatures(archive), b = signatures(current);
        // The project uses one persistent signing identity. Reject unrecognized rotations.
        if (a == null || b == null || a.length == 0 || !new HashSet<>(Arrays.asList(a)).equals(new HashSet<>(Arrays.asList(b)))) throw new Exception("wrong signer");
    }
    static String downloadState(int status) {
        switch (status) {
            case DownloadManager.STATUS_PENDING: return "pending";
            case DownloadManager.STATUS_RUNNING: return "downloading";
            case DownloadManager.STATUS_PAUSED: return "paused";
            case DownloadManager.STATUS_SUCCESSFUL: return "downloaded";
            default: return "failed";
        }
    }
}
