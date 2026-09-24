package com.aithss.finance;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.res.Configuration;
import androidx.activity.EdgeToEdge;

public class MainActivity extends BridgeActivity {
    static volatile boolean foreground = false;
    @Override public void onResume() { super.onResume(); foreground = true; }
    @Override public void onPause() { foreground = false; super.onPause(); }
    private int windowBackgroundColor = 0xff0a0e0c;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WindowAppearancePlugin.class);
        registerPlugin(LocalGeminiPlugin.class);
        registerPlugin(ApkDownloadPlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        windowBackgroundColor = getPreferences(MODE_PRIVATE).getInt("windowBackground", windowBackgroundColor);
        getWindow().getDecorView().setBackgroundColor(windowBackgroundColor);
    }

    // SystemBars owns all insets. Older WebViews expose the native window in
    // those areas, so its background must follow the app's explicit theme.
    public void setWindowBackground(int color) {
        windowBackgroundColor = color;
        getPreferences(MODE_PRIVATE).edit().putInt("windowBackground", color).apply();
        getWindow().getDecorView().setBackgroundColor(color);
    }

    @Override
    public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        getWindow().getDecorView().setBackgroundColor(windowBackgroundColor);
    }
}
