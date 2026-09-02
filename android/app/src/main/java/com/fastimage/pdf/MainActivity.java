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
import android.webkit.DownloadListener;
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
    private Uri lastSavedPdfUri = null;

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

            webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");

            // সাধারণ ডাউনলোড লিসেনার
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    if (url.startsWith("blob:") || url.startsWith("data:")) {
                        webView.evaluateJavascript("window.extractAndSavePdf('" + url + "', 'download');", null);
                    }
                }
            });

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    // ব্রাউজারের ভেতর তৈরি হওয়া PDF Blob সরাসরি জাভায় পাঠানো
                    String js = "window.extractAndSavePdf = function(blobUrl, action) {" +
                                "  var xhr = new XMLHttpRequest();" +
                                "  xhr.open('GET', blobUrl, true);" +
                                "  xhr.responseType = 'blob';" +
                                "  xhr.onload = function() {" +
                                "    var reader = new FileReader();" +
                                "    reader.readAsDataURL(xhr.response);" +
                                "    reader.onloadend = function() {" +
                                "      var b64 = reader.result.split(',')[1];" +
                                "      AndroidApp.processPdfData(b64, 'FastPDF_' + Date.now() + '.pdf', action);" +
                                "    }" +
                                "  };" +
                                "  xhr.send();" +
                                "};" +
                                "document.addEventListener('click', function(e) {" +
                                "  var el = e.target.closest('button, a');" +
                                "  if (!el) return;" +
                                "  var txt = (el.innerText || '').toLowerCase();" +
                                "  var link = document.querySelector('a[download]');" +
                                "  var href = link ? link.href : '';" +
                                "  if (txt.includes('download') || txt.includes('save')) {" +
                                "    if(href) { e.preventDefault(); window.extractAndSavePdf(href, 'save'); }" +
                                "  } else if (txt.includes('open') || txt.includes('preview')) {" +
                                "    if(href) { e.preventDefault(); window.extractAndSavePdf(href, 'open'); }" +
                                "  } else if (txt.includes('share')) {" +
                                "    if(href) { e.preventDefault(); window.extractAndSavePdf(href, 'share'); }" +
                                "  }" +
                                "}, true);";
                    view.evaluateJavascript(js, null);
                }
            });

            // ফটো ও গ্যালারি পিকার
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

    class AndroidBridge {
        @JavascriptInterface
        public void processPdfData(String base64Data, String filename, String action) {
            try {
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    lastSavedPdfUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                } else {
                    lastSavedPdfUri = getContentResolver().insert(MediaStore.Files.getContentUri("external"), values);
                }

                if (lastSavedPdfUri != null) {
                    OutputStream os = getContentResolver().openOutputStream(lastSavedPdfUri);
                    if (os != null) {
                        os.write(pdfBytes);
                        os.close();
                    }
                }

                runOnUiThread(() -> {
                    if ("share".equalsIgnoreCase(action)) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("application/pdf");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, lastSavedPdfUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(shareIntent, "Share PDF using"));
                    } else if ("open".equalsIgnoreCase(action)) {
                        Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                        viewIntent.setDataAndType(lastSavedPdfUri, "application/pdf");
                        viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(viewIntent, "Open PDF with"));
                    } else {
                        Toast.makeText(MainActivity.this, "PDF Downloaded to Downloads folder", Toast.LENGTH_LONG).show();
                    }
                });

            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Failed to save file", Toast.LENGTH_SHORT).show());
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

