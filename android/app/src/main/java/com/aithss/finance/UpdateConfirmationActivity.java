package com.aithss.finance;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/** A notification or foreground user action opens the system's confirmation. */
public class UpdateConfirmationActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Intent confirmation = getIntent().getParcelableExtra(Intent.EXTRA_INTENT);
        if (confirmation != null) {
            try { startActivity(confirmation); }
            catch (Exception e) { ApkUpdateState.state(this, "failed", "Không mở được xác nhận cài đặt."); }
        }
        UpdateInstallReceiver.cancelNotification(this);
        finish();
    }
}
