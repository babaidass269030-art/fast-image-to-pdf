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
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;
    private Uri lastSavedUri = null;
    private File lastSavedFile = null;

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
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);

            webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    // বাটন ক্লিকের ইভেন্টগুলো Native জাভায় রিডাইরেক্ট করা
                    String js = "window.downloadBlob = function(blobUrl, filename, actionType) {" +
                                "  var xhr = new XMLHttpRequest();" +
                                "  xhr.open('GET', blobUrl, true);" +
                                "  xhr.responseType = 'blob';" +
                                "  xhr.onload = function() {" +
                                "    var reader = new FileReader();" +
                                "    reader.readAsDataURL(xhr.response);" +
                                "    reader.onloadend = function() {" +
                                "      var base64data = reader.result.split(',')[1];" +
                                "      AndroidApp.handlePdfAction(base64data, filename, actionType);" +
                                "    }" +
                                "  };" +
                                "  xhr.send();" +
                                "};" +
                                "document.addEventListener('click', function(e) {" +
                                "  var btn = e.target.closest('button, a');" +
                                "  if (!btn) return;" +
                                "  var text = (btn.innerText || '').toLowerCase();" +
                                "  var target = e.target.closest('a');" +
                                "  var blobUrl = target ? target.href : (window.lastPdfBlobUrl || '');" +
                                "  if (text.includes('share')) {" +
                                "    e.preventDefault();" +
                                "    if(blobUrl) window.downloadBlob(blobUrl, 'FastPDF_Share.pdf', 'share');" +
                                "    else AndroidApp.shareLastPdf();" +
                                "  } else if (text.includes('open') || text.includes('full window')) {" +
                                "    e.preventDefault();" +
                                "    if(blobUrl) window.downloadBlob(blobUrl, 'FastPDF_Doc.pdf', 'open');" +
                                "    else AndroidApp.openLastPdf();" +
                                "  } else if (text.includes('save') || text.includes('download')) {" +
                                "    e.preventDefault();" +
                                "    if(blobUrl) window.downloadBlob(blobUrl, 'FastPDF_' + Date.now() + '.pdf', 'save');" +
                                "  }" +
                                "}, true);";
                    view.evaluateJavascript(js, null);
                }
            });

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
        public void handlePdfAction(String base64Data, String filename, String actionType) {
            try {
                byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);

                // শেয়ার এবং ওপেন করার জন্য ক্যাশ ডিরেক্টরিতে সেভ
                File cacheDir = new File(getCacheDir(), "shared_pdfs");
                if (!cacheDir.exists()) cacheDir.mkdirs();
                File tempFile = new File(cacheDir, filename.endsWith(".pdf") ? filename : filename + ".pdf");
                FileOutputStream fos = new FileOutputStream(tempFile);
                fos.write(pdfBytes);
                fos.close();
                lastSavedFile = tempFile;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    lastSavedUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                } else {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                    lastSavedUri = getContentResolver().insert(MediaStore.Files.getContentUri("external"), values);
                }

                if (lastSavedUri != null) {
                    OutputStream os = getContentResolver().openOutputStream(lastSavedUri);
                    if (os != null) {
                        os.write(pdfBytes);
                        os.close();
                    }
                }

                runOnUiThread(() -> {
                    if ("share".equalsIgnoreCase(actionType)) {
                        shareLastPdf();
                    } else if ("open".equalsIgnoreCase(actionType)) {
                        openLastPdf();
                    } else {
                        Toast.makeText(MainActivity.this, "PDF Saved to Downloads!", Toast.LENGTH_SHORT).show();
                    }
                });

            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Operation failed", Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface
        public void shareLastPdf() {
            runOnUiThread(() -> {
                try {
                    if (lastSavedFile == null || !lastSavedFile.exists()) {
                        Toast.makeText(MainActivity.this, "Save PDF first to share", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    Uri fileUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".provider", lastSavedFile);
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType("application/pdf");
                    intent.putExtra(Intent.EXTRA_STREAM, fileUri);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(intent, "Share PDF via"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Share Error", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void openLastPdf() {
            runOnUiThread(() -> {
                try {
                    if (lastSavedFile == null || !lastSavedFile.exists()) {
                        Toast.makeText(MainActivity.this, "File not ready to open", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    Uri fileUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".provider", lastSavedFile);
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(fileUri, "application/pdf");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(intent, "Open PDF"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Open Error", Toast.LENGTH_SHORT).show();
                }
            });
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
