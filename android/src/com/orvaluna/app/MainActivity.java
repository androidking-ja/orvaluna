package com.orvaluna.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.StrictMode;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Locale;

public class MainActivity extends Activity {

    private WebView web;
    private long lastBack = 0;
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().build());

        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        w.setStatusBarColor(Color.parseColor("#140A08"));
        w.setNavigationBarColor(Color.parseColor("#140A08"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#140A08"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new Bridge(), "OrvalunaNative");
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) { return true; }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (u != null && ("http".equals(u.getScheme()) || "https".equals(u.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
        });

        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.evaluateJavascript("window.__appPause&&window.__appPause()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.__appResume&&window.__appResume()", null);
    }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.__appBack?window.__appBack():false)", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if ("true".equals(value)) return;
                long now = System.currentTimeMillis();
                if (now - lastBack < 2000) {
                    finish();
                } else {
                    lastBack = now;
                    Toast.makeText(MainActivity.this, getString(R.string.exit), Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    private Uri savePdf(String base64, String fileName) throws Exception {
        byte[] data = Base64.decode(base64, Base64.DEFAULT);
        if (Build.VERSION.SDK_INT >= 29) {
            ContentResolver cr = getContentResolver();
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
            cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Orvaluna");
            Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("insert failed");
            OutputStream os = cr.openOutputStream(uri);
            os.write(data);
            os.flush();
            os.close();
            return uri;
        } else {
            File dir = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
            if (dir == null) dir = getFilesDir();
            if (!dir.exists()) dir.mkdirs();
            File f = new File(dir, fileName);
            FileOutputStream fos = new FileOutputStream(f);
            fos.write(data);
            fos.close();
            return Uri.fromFile(f);
        }
    }

    public class Bridge {
        @JavascriptInterface
        public String getLanguage() {
            return Locale.getDefault().getLanguage();
        }

        @JavascriptInterface
        public boolean isNative() { return true; }

        @JavascriptInterface
        public void savePdf(final String base64, final String fileName, final boolean share) {
            ui.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        Uri uri = MainActivity.this.savePdf(base64, fileName);
                        Toast.makeText(MainActivity.this, getString(R.string.saved), Toast.LENGTH_LONG).show();
                        Intent i;
                        if (share) {
                            i = new Intent(Intent.ACTION_SEND);
                            i.setType("application/pdf");
                            i.putExtra(Intent.EXTRA_STREAM, uri);
                        } else {
                            i = new Intent(Intent.ACTION_VIEW);
                            i.setDataAndType(uri, "application/pdf");
                        }
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        try {
                            startActivity(Intent.createChooser(i, getString(R.string.open_with)));
                        } catch (Exception ignored) {}
                        if (web != null) web.evaluateJavascript("window.__pdfSaved&&window.__pdfSaved(true)", null);
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, getString(R.string.error), Toast.LENGTH_LONG).show();
                        if (web != null) web.evaluateJavascript("window.__pdfSaved&&window.__pdfSaved(false)", null);
                    }
                }
            });
        }
    }
}
