package com.aithss.finance;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Theme color only. This plugin never changes padding, insets or bar icons. */
@CapacitorPlugin(name = "WindowAppearance")
public class WindowAppearancePlugin extends Plugin {
    @PluginMethod
    public void setBackground(PluginCall call) {
        String color = call.getString("color");
        if (color == null || !color.matches("#[0-9a-fA-F]{6}")) {
            call.reject("Expected a six-digit theme color");
            return;
        }
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).setWindowBackground(Color.parseColor(color));
            call.resolve();
        });
    }
}
