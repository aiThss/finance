package com.aithss.installerprobe;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.content.res.XmlResourceParser;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Parcel;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** Loads the actual archive, without installing it or using this APK's resources. */
public class ProbeActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        File apk = new File(getExternalFilesDir(null), "candidate.apk");
        JSONObject report = new JSONObject();
        try {
            report.put("canRequestPackageInstalls", getPackageManager().canRequestPackageInstalls());
            if ("open".equals(getIntent().getStringExtra("mode"))) {
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(FileProvider.getUriForFile(this,
                        "com.aithss.installerprobe.files", apk), "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(install);
            } else if ("probe".equals(getIntent().getStringExtra("mode")) && apk.exists()) {
                PackageInfo info = getPackageManager().getPackageArchiveInfo(apk.getPath(), 0);
                if (info == null) throw new IllegalStateException("Cannot parse archive");
                ApplicationInfo app = info.applicationInfo;
                app.sourceDir = app.publicSourceDir = apk.getPath();
                Resources res = getPackageManager().getResourcesForApplication(app);
                int normal = 0, round = 0;
                try (XmlResourceParser xml = res.getAssets().openXmlResourceParser("AndroidManifest.xml")) {
                    while (xml.next() != XmlResourceParser.END_DOCUMENT) {
                        if (xml.getEventType() == XmlResourceParser.START_TAG && "application".equals(xml.getName())) {
                            normal = xml.getAttributeResourceValue("http://schemas.android.com/apk/res/android", "icon", 0);
                            round = xml.getAttributeResourceValue("http://schemas.android.com/apk/res/android", "roundIcon", 0);
                            break;
                        }
                    }
                }
                if (normal == 0 || round == 0) throw new IllegalStateException("Missing manifest icon / roundIcon");
                report.put("version", info.versionName).put("versionCode", info.getLongVersionCode());
                report.put("api", android.os.Build.VERSION.SDK_INT);
                report.put("packageManagerIcon", describe(app.loadIcon(getPackageManager())));
                JSONArray rows = new JSONArray();
                for (int density : new int[]{120, 160, 240, 320, 420, 480, 560, 640}) {
                    Configuration config = new Configuration(res.getConfiguration());
                    config.densityDpi = density;
                    DisplayMetrics metrics = new DisplayMetrics();
                    metrics.setTo(res.getDisplayMetrics());
                    metrics.densityDpi = density;
                    metrics.density = density / 160f;
                    res.updateConfiguration(config, metrics);
                    for (int id : new int[]{normal, round}) {
                        JSONObject row = describe(res.getDrawable(id, null));
                        TypedValue value = new TypedValue();
                        res.getValue(id, value, true);
                        row.put("density", density).put("resource", res.getResourceName(id))
                                .put("selectedPath", value.string).put("resourceDensity", value.density);
                        int fg = res.getIdentifier("ic_launcher_foreground", "mipmap", app.packageName);
                        if (fg != 0) {
                            res.getValue(fg, value, true);
                            row.put("foregroundPath", value.string).put("foregroundDensity", value.density);
                        }
                        rows.put(row);
                    }
                }
                report.put("icons", rows);
            }
        } catch (Exception e) {
            try { report.put("error", e.toString()); } catch (Exception ignored) { }
        }
        try (FileOutputStream out = new FileOutputStream(new File(getExternalFilesDir(null), "report.json"))) {
            out.write(report.toString(2).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) { throw new RuntimeException(e); }
        finish();
    }

    private JSONObject describe(Drawable icon) throws Exception {
        JSONObject result = new JSONObject().put("class", icon.getClass().getSimpleName())
                .put("width", icon.getIntrinsicWidth()).put("height", icon.getIntrinsicHeight());
        if (icon instanceof BitmapDrawable) {
            Bitmap bitmap = ((BitmapDrawable) icon).getBitmap();
            result.put("bitmapDensity", bitmap.getDensity()).put("bitmapWidth", bitmap.getWidth());
        }
        if (icon instanceof AdaptiveIconDrawable) {
            AdaptiveIconDrawable adaptive = (AdaptiveIconDrawable) icon;
            result.put("foreground", describe(adaptive.getForeground()));
            result.put("background", describe(adaptive.getBackground()));
        }
        // Same dimensions, draw and bitmap parcel operation as AppSnippet. Do NOT clamp:
        // a 0/-1 dimension must remain visible as the original failure.
        try {
            Bitmap bitmap = Bitmap.createBitmap(icon.getIntrinsicWidth(), icon.getIntrinsicHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            icon.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            icon.draw(canvas);
            Parcel parcel = Parcel.obtain();
            try { bitmap.writeToParcel(parcel, 0); } finally { parcel.recycle(); bitmap.recycle(); }
            result.put("parcelBitmap", "ok");
        } catch (Exception e) { result.put("parcelBitmap", e.toString()); }
        return result;
    }
}
