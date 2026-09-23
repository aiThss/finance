package com.aithss.finance;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;

/** User-owned key: encrypted at rest, never returned to JavaScript or backups.
 * Network destination is fixed; no arbitrary URL can receive the credential. */
@CapacitorPlugin(name = "LocalGemini")
public class LocalGeminiPlugin extends Plugin {
    private static final String ALIAS = "tui-nho-gemini-v1";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("local-gemini", Context.MODE_PRIVATE);
    }
    private SecretKey encryptionKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }
    private String readKey() throws Exception {
        String encrypted = prefs().getString("ciphertext", null);
        if (encrypted == null) return null;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, Base64.decode(prefs().getString("iv", ""), Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
    @PluginMethod
    public void status(PluginCall call) {
        worker.execute(() -> {
            try { call.resolve(new JSObject().put("configured", readKey() != null)); }
            catch (Exception e) { call.reject("Không đọc được key đã lưu. Xóa key rồi nhập lại."); }
        });
    }
    @PluginMethod
    public void save(PluginCall call) {
        String key = call.getString("key", "").trim();
        if (!key.matches("[A-Za-z0-9_-]{20,256}")) {
            call.reject("API key không hợp lệ. Sao chép lại từ Google AI Studio."); return;
        }
        worker.execute(() -> {
            try {
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.ENCRYPT_MODE, encryptionKey());
                String encrypted = Base64.encodeToString(cipher.doFinal(key.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
                boolean saved = prefs().edit().putString("ciphertext", encrypted)
                    .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).commit();
                if (!saved) throw new Exception();
                call.resolve();
            } catch (Exception e) { call.reject("Không lưu được API key trên thiết bị."); }
        });
    }
    @PluginMethod
    public void remove(PluginCall call) {
        worker.execute(() -> {
            if (prefs().edit().clear().commit()) call.resolve();
            else call.reject("Không xóa được API key. Hãy thử lại.");
        });
    }
    @PluginMethod
    public void request(PluginCall call) {
        String body = call.getString("body");
        boolean check = Boolean.TRUE.equals(call.getBoolean("check", false));
        if (!check && (body == null || body.length() > 6000000)) { call.reject("Nội dung quá lớn hoặc không hợp lệ."); return; }
        worker.execute(() -> {
            HttpsURLConnection connection = null;
            try {
                String key = readKey();
                if (key == null) { call.reject("Nhập Gemini API key của bạn trong Cài đặt trước."); return; }
                String endpoint = check ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash" : "https://generativelanguage.googleapis.com/v1beta/interactions";
                connection = (HttpsURLConnection) new URL(endpoint).openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(25000);
                connection.setRequestProperty("x-goog-api-key", key);
                if (!check) {
                    connection.setRequestMethod("POST");
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setDoOutput(true);
                    try (java.io.OutputStream out = connection.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
                }
                int status = connection.getResponseCode();
                // Never echo Google's raw error, which can contain request details.
                if (status < 200 || status >= 300) { call.resolve(new JSObject().put("status", status).put("body", "{}")); return; }
                try (InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int n;
                    while ((n = in.read(buffer)) != -1) {
                        if (out.size() + n > 1000000) throw new Exception();
                        out.write(buffer, 0, n);
                    }
                    call.resolve(new JSObject().put("status", status).put("body", out.toString("UTF-8")));
                }
            } catch (Exception e) { call.reject("Không kết nối được Gemini. Kiểm tra mạng hoặc thử lại sau."); }
            finally { if (connection != null) connection.disconnect(); }
        });
    }
    @Override protected void handleOnDestroy() { worker.shutdownNow(); }
}
