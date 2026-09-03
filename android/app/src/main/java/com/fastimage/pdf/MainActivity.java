package com.fastimage.pdf;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.startapp.sdk.ads.banner.Banner;
import com.startapp.sdk.adsbase.StartAppSDK;

import java.io.OutputStream;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            getWindow().setStatusBarColor(Color.WHITE);
        }

        // Start.io SDK ইনিশিয়ালাইজেশন (অফিসিয়াল ও নিরাপদ)
        StartAppSDK.init(this, "207781120", false);
        StartAppSDK.enableReturnAds(false);

        // রুট লেআউট
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        // WebView কন্টেইনার
        FrameLayout webViewContainer = new FrameLayout(this);
        LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f);
        webViewContainer.setLayoutParams(webViewParams);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        webViewContainer.addView(webView);
        rootLayout.addView(webViewContainer);

        // স্ক্রিনের নিচে লাইভ ব্যানার অ্যাড
        FrameLayout bannerContainer = new FrameLayout(this);
        LinearLayout.LayoutParams bannerParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        bannerContainer.setLayoutParams(bannerParams);
        bannerContainer.setBackgroundColor(Color.parseColor("#F8FAFC"));

        Banner startAppBanner = new Banner(this);
        FrameLayout.LayoutParams bannerViewParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER_HORIZONTAL);
        bannerContainer.addView(startAppBanner, bannerViewParams);
        rootLayout.addView(bannerContainer);

        setContentView(rootLayout);

        // ওয়েব সেটিংস
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");
        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                    uploadMessage = null;
                }
                uploadMessage = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

                startActivityForResult(Intent.createChooser(intent, "Select Images"), FILECHOOSER_RESULTCODE);
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    class AndroidBridge {
        @JavascriptInterface
        public void handlePdfAction(String base64Data, String filename, String action) {
            try {
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");

                Uri fileUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    fileUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                } else {
                    fileUri = getContentResolver().insert(MediaStore.Files.getContentUri("external"), values);
                }

                if (fileUri != null) {
                    OutputStream os = getContentResolver().openOutputStream(fileUri);
                    if (os != null) {
                        os.write(pdfBytes);
                        os.close();
                    }
                }

                runOnUiThread(() -> {
                    if ("share".equalsIgnoreCase(action)) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("application/pdf");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(shareIntent, "Share PDF with"));
                    } else if ("open".equalsIgnoreCase(action)) {
                        Intent openIntent = new Intent(Intent.ACTION_VIEW);
                        openIntent.setDataAndType(fileUri, "application/pdf");
                        openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(openIntent, "Open PDF with"));
                    } else {
                        Toast.makeText(MainActivity.this, "✓ Downloaded to Downloads folder", Toast.LENGTH_SHORT).show();
                    }
                });

            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Action Failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            uploadMessage.onReceiveValue(results);
            uploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

