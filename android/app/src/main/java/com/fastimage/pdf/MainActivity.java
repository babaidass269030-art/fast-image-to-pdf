package com.fastimage.pdf;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.OutputStream;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            webView = new WebView(this);
            setContentView(webView);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);

            // জাভাস্ক্রিপ্ট থেকে PDF ডাউনলোড ও শেয়ার নেওয়ার জন্য ইন্টারফেস
            webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    // ব্রাউজারের ডাউনলোড ক্লিককে Native App-এ রিডাইরেক্ট করার স্ক্রিপ্ট
                    String js = "window.downloadBlob = function(blobUrl, filename) {" +
                                "  var xhr = new XMLHttpRequest();" +
                                "  xhr.open('GET', blobUrl, true);" +
                                "  xhr.responseType = 'blob';" +
                                "  xhr.onload = function() {" +
                                "    var reader = new FileReader();" +
                                "    reader.readAsDataURL(xhr.response);" +
                                "    reader.onloadend = function() {" +
                                "      var base64data = reader.result.split(',')[1];" +
                                "      AndroidApp.savePdf(base64data, filename);" +
                                "    }" +
                                "  };" +
                                "  xhr.send();" +
                                "};" +
                                "document.addEventListener('click', function(e) {" +
                                "  var target = e.target.closest('a');" +
                                "  if (target && target.href && (target.href.startsWith('blob:') || target.href.startsWith('data:'))) {" +
                                "    e.preventDefault();" +
                                "    var name = target.getAttribute('download') || 'FastPDF_' + Date.now() + '.pdf';" +
                                "    window.downloadBlob(target.href, name);" +
                                "  }" +
                                "}, true);";
                    view.evaluateJavascript(js, null);
                }
            });

            // ইমেজ পিকার হ্যান্ডলার
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
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // PDF ফাইল সেভ এবং শেয়ার করার নেটিভ মেথড
    class AndroidBridge {
        @JavascriptInterface
        public void savePdf(String base64Data, String filename) {
            try {
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
                Uri uri;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                } else {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                    uri = getContentResolver().insert(MediaStore.Files.getContentUri("external"), values);
                }

                if (uri != null) {
                    OutputStream os = getContentResolver().openOutputStream(uri);
                    if (os != null) {
                        os.write(pdfBytes);
                        os.close();
                    }

                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "PDF Downloaded to Downloads folder", Toast.LENGTH_LONG).show();
                        
                        // সেভ হওয়ার পর ফাইলটি সরাসরি ওপেন/শেয়ার করার ডায়ালগ
                        Intent shareIntent = new Intent(Intent.ACTION_VIEW);
                        shareIntent.setDataAndType(uri, "application/pdf");
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(shareIntent, "Open PDF with"));
                    });
                }
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Error saving PDF", Toast.LENGTH_SHORT).show());
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
