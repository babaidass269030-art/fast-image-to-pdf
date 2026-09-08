package com.fastimage.pdf;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.RelativeLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.StartAppSDK;
import com.startapp.sdk.ads.banner.Banner;
import com.startapp.sdk.ads.banner.BannerListener;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    public static final String TAG = "FastPDF";
    public static final String STARTIO_APP_ID = "207781120";
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1002;

    private WebView webView;
    private FrameLayout bannerContainer;
    private Banner startIoBanner;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraPhotoUri;
    private File tempCameraFile;
    private WebChromeClient.FileChooserParams pendingFileChooserParams;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Global crash guard for uncaught background threads
        try {
            Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
                Log.e(TAG, "Uncaught exception on thread " + (thread != null ? thread.getName() : "unknown")
                        + ": " + (throwable != null ? throwable.getMessage() : "null"), throwable);
            });
        } catch (Throwable ignored) {}

        try {
            // 1. Build and set Layout immediately so screen is never blank or dismissed
            RelativeLayout rootLayout = new RelativeLayout(this);
            rootLayout.setLayoutParams(new RelativeLayout.LayoutParams(
                    RelativeLayout.LayoutParams.MATCH_PARENT,
                    RelativeLayout.LayoutParams.MATCH_PARENT
            ));

            // Create Webview
            webView = new WebView(this);
            RelativeLayout.LayoutParams webViewParams = new RelativeLayout.LayoutParams(
                    RelativeLayout.LayoutParams.MATCH_PARENT,
                    RelativeLayout.LayoutParams.MATCH_PARENT
            );
            webView.setLayoutParams(webViewParams);
            webView.setBackgroundColor(0xFFF8FAFC);

            // Create Banner Container at the bottom of the screen
            bannerContainer = new FrameLayout(this);
            RelativeLayout.LayoutParams bannerParams = new RelativeLayout.LayoutParams(
                    RelativeLayout.LayoutParams.MATCH_PARENT,
                    RelativeLayout.LayoutParams.WRAP_CONTENT
            );
            bannerParams.addRule(RelativeLayout.ALIGN_PARENT_BOTTOM);
            bannerContainer.setLayoutParams(bannerParams);

            rootLayout.addView(webView);
            rootLayout.addView(bannerContainer);
            bannerContainer.bringToFront();
            setContentView(rootLayout);

            // 2. Configure WebView Settings safely
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    WebView.setWebContentsDebuggingEnabled(true);
                }
            } catch (Throwable ignored) {}

            try {
                WebSettings webSettings = webView.getSettings();
                webSettings.setJavaScriptEnabled(true);
                webSettings.setDomStorageEnabled(true);
                webSettings.setAllowFileAccess(true);
                webSettings.setAllowContentAccess(true);
                webSettings.setAllowFileAccessFromFileURLs(true);
                webSettings.setAllowUniversalAccessFromFileURLs(true);
                webSettings.setDatabaseEnabled(true);
                webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
                webSettings.setUseWideViewPort(true);
                webSettings.setLoadWithOverviewMode(true);
                webSettings.setSupportZoom(false);
                webSettings.setDisplayZoomControls(false);
            } catch (Throwable t) {
                Log.e(TAG, "WebSettings config error: " + t.getMessage(), t);
            }

            // Register Android JavaScriptInterface Bridges
            try {
                webView.addJavascriptInterface(new StartAppBridge(), "StartAppAndroid");
                webView.addJavascriptInterface(new StartAppBridge(), "StartApp");
                webView.addJavascriptInterface(new AndroidAppBridge(), "AndroidApp");
            } catch (Throwable t) {
                Log.e(TAG, "JavaScriptInterface registration error: " + t.getMessage(), t);
            }

            // 3. Register WebView DownloadListener for blob and file downloads
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    handleWebViewDownload(url, contentDisposition, mimetype);
                }
            });

            // 4. Custom WebViewClient with logging, blob intercept, and crash recovery
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (request != null && request.getUrl() != null) {
                        Uri uri = request.getUrl();
                        String scheme = uri.getScheme();
                        String url = uri.toString();

                        if ("blob".equalsIgnoreCase(scheme) || "data".equalsIgnoreCase(scheme)) {
                            // Intercept blob/data downloads directly so WebView never shows an error screen
                            handleWebViewDownload(url, null, "application/pdf");
                            return true;
                        }

                        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                            if (!url.contains("android_asset")) {
                                try {
                                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(intent);
                                    return true;
                                } catch (Throwable ignored) {}
                            }
                        }
                    }
                    return false;
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url != null) {
                        if (url.startsWith("blob:") || url.startsWith("data:")) {
                            handleWebViewDownload(url, null, "application/pdf");
                            return true;
                        }
                        if ((url.startsWith("http://") || url.startsWith("https://")) && !url.contains("android_asset")) {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                                return true;
                            } catch (Throwable ignored) {}
                        }
                    }
                    return false;
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    Log.d(TAG, "Page loaded successfully: " + url);
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    // Do NOT call super.onReceivedError to prevent displaying Android's raw "Webpage not available" error screen
                    if (request != null && request.getUrl() != null) {
                        String url = request.getUrl().toString();
                        if (url.startsWith("blob:") || url.startsWith("data:")) {
                            return; // Suppress blob/data URL errors
                        }
                        Log.w(TAG, "WebView load error on: " + url);
                    }
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    if (failingUrl != null && (failingUrl.startsWith("blob:") || failingUrl.startsWith("data:"))) {
                        return;
                    }
                    Log.w(TAG, "WebView legacy error: " + description);
                }

                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    Log.e(TAG, "WebView render process gone. Crashed: " + (detail != null && detail.didCrash()));
                    try {
                        if (webView != null) {
                            ViewGroup parent = (ViewGroup) webView.getParent();
                            if (parent != null) {
                                parent.removeView(webView);
                            }
                            webView.destroy();
                            webView = null;
                        }
                    } catch (Throwable ignored) {}
                    recreate();
                    return true;
                }
            });

            // WebChromeClient for console logging and HTML5 File Chooser with native Camera support
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    if (consoleMessage != null) {
                        Log.d(TAG + "-JS", consoleMessage.message() + " -- From line "
                                + consoleMessage.lineNumber() + " of "
                                + consoleMessage.sourceId());
                    }
                    return true;
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallbackParam, FileChooserParams fileChooserParams) {
                    try {
                        if (filePathCallback != null) {
                            try {
                                filePathCallback.onReceiveValue(null);
                            } catch (Throwable ignored) {}
                            filePathCallback = null;
                        }
                        filePathCallback = filePathCallbackParam;

                        if (fileChooserParams != null && fileChooserParams.isCaptureEnabled()) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                                pendingFileChooserParams = fileChooserParams;
                                ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST_CODE);
                                return true;
                            }
                        }

                        launchFileChooser(fileChooserParams);
                        return true;
                    } catch (Throwable t) {
                        Log.e(TAG, "onShowFileChooser error: " + t.getMessage(), t);
                        if (filePathCallbackParam != null) {
                            try {
                                filePathCallbackParam.onReceiveValue(null);
                            } catch (Throwable ignored) {}
                        }
                        filePathCallback = null;
                        return false;
                    }
                }
            });

            // 3. Load React App from Assets
            webView.loadUrl("file:///android_asset/index.html");

            // 4. Initialize Start.io Android SDK and load banner
            initAndShowStartIoAds();

        } catch (Throwable t) {
            Log.e(TAG, "Fatal error during MainActivity onCreate: " + t.getMessage(), t);
        }
    }

    /**
     * Initialize Start.io SDK and display banner ad
     */
    private void initAndShowStartIoAds() {
        runOnUiThread(() -> {
            try {
                StartAppSDK.setTestAdsEnabled(false);
                StartAppSDK.init(this, "207781120", false);
                StartAppAd.disableSplash();
                loadAndShowBanner();
            } catch (Throwable t) {
                Log.e(TAG, "Start.io init error: " + t.getMessage(), t);
            }
        });
    }

    /**
     * Create a temporary file Uri for Camera capture via FileProvider
     */
    private Intent createCameraIntent() {
        try {
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String imageFileName = "IMG_" + timeStamp + "_";
            File storageDir = getExternalCacheDir();
            if (storageDir == null) {
                storageDir = getCacheDir();
            }
            if (storageDir != null && !storageDir.exists()) {
                storageDir.mkdirs();
            }
            tempCameraFile = File.createTempFile(imageFileName, ".jpg", storageDir);
            String authority = getPackageName() + ".fileprovider";
            cameraPhotoUri = FileProvider.getUriForFile(this, authority, tempCameraFile);

            Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
            takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            takePictureIntent.setClipData(ClipData.newRawUri("Camera", cameraPhotoUri));
            return takePictureIntent;
        } catch (Throwable t) {
            Log.w(TAG, "Failed to create camera intent: " + t.getMessage(), t);
            tempCameraFile = null;
            cameraPhotoUri = null;
            return null;
        }
    }

    /**
     * Launch File Chooser or Camera Intent
     */
    private void launchFileChooser(WebChromeClient.FileChooserParams fileChooserParams) {
        try {
            boolean isCapture = fileChooserParams != null && fileChooserParams.isCaptureEnabled();

            // Direct Camera Trigger when capture="environment" is set
            if (isCapture) {
                Intent takePictureIntent = createCameraIntent();
                if (takePictureIntent != null) {
                    try {
                        startActivityForResult(takePictureIntent, FILE_CHOOSER_RESULT_CODE);
                        return;
                    } catch (Throwable e) {
                        Log.w(TAG, "Direct camera launch failed, falling back: " + e.getMessage());
                    }
                }
            }

            // Gallery / File selection intent supporting multiple photos
            Intent galleryIntent = new Intent(Intent.ACTION_GET_CONTENT);
            galleryIntent.addCategory(Intent.CATEGORY_OPENABLE);
            galleryIntent.setType("image/*");
            galleryIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            galleryIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                    "image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif", "image/*"
            });

            Intent chooserIntent = Intent.createChooser(galleryIntent, "Select Images");

            // Include camera option in the chooser
            Intent cameraOptionIntent = createCameraIntent();
            if (cameraOptionIntent != null) {
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraOptionIntent});
            }

            startActivityForResult(chooserIntent, FILE_CHOOSER_RESULT_CODE);
        } catch (Throwable e) {
            Log.e(TAG, "Error in launchFileChooser: " + e.getMessage(), e);
            if (filePathCallback != null) {
                try {
                    filePathCallback.onReceiveValue(null);
                } catch (Throwable ignored) {}
                filePathCallback = null;
            }
            Toast.makeText(MainActivity.this, "Unable to open image picker", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        try {
            if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
                if (filePathCallback != null) {
                    launchFileChooser(pendingFileChooserParams);
                    pendingFileChooserParams = null;
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error in onRequestPermissionsResult: " + t.getMessage(), t);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                try {
                    if (resultCode == Activity.RESULT_OK) {
                        List<Uri> uriList = new ArrayList<>();

                        // Check if camera captured an image
                        boolean isCameraCapture = false;
                        if (tempCameraFile != null && tempCameraFile.exists() && tempCameraFile.length() > 0) {
                            if (data == null || (data.getData() == null && data.getClipData() == null)) {
                                isCameraCapture = true;
                                if (cameraPhotoUri != null) {
                                    uriList.add(cameraPhotoUri);
                                }
                            }
                        }

                        // Process gallery / file picker results
                        if (!isCameraCapture && data != null) {
                            // 1. Multiple files selected (ClipData)
                            if (data.getClipData() != null) {
                                ClipData clipData = data.getClipData();
                                int count = clipData.getItemCount();
                                for (int i = 0; i < count; i++) {
                                    Uri itemUri = clipData.getItemAt(i).getUri();
                                    if (itemUri != null) {
                                        uriList.add(itemUri);
                                    }
                                }
                            }

                            // 2. Single file selected (data.getData())
                            if (uriList.isEmpty() && data.getData() != null) {
                                uriList.add(data.getData());
                            }

                            // 3. Fallback to parseResult
                            if (uriList.isEmpty()) {
                                try {
                                    Uri[] parsed = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                                    if (parsed != null && parsed.length > 0) {
                                        for (Uri u : parsed) {
                                            if (u != null) uriList.add(u);
                                        }
                                    }
                                } catch (Throwable ignored) {}
                            }
                        }

                        // Fallback to camera URI if nothing else was retrieved and camera file has bytes
                        if (uriList.isEmpty() && cameraPhotoUri != null && tempCameraFile != null && tempCameraFile.exists() && tempCameraFile.length() > 0) {
                            uriList.add(cameraPhotoUri);
                        }

                        if (!uriList.isEmpty()) {
                            results = uriList.toArray(new Uri[0]);
                        }
                    }
                } catch (Throwable t) {
                    Log.e(TAG, "Error processing file chooser result: " + t.getMessage(), t);
                } finally {
                    // Clean up 0-byte temporary camera file if camera was not used
                    try {
                        if (tempCameraFile != null && tempCameraFile.exists() && tempCameraFile.length() == 0) {
                            tempCameraFile.delete();
                        }
                    } catch (Throwable ignored) {}
                    tempCameraFile = null;
                    cameraPhotoUri = null;

                    // Always notify callback to avoid WebView file chooser freeze
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    /**
     * Loads and displays Start.io bottom banner safely
     */
    private void loadAndShowBanner() {
        runOnUiThread(() -> {
            try {
                if (bannerContainer == null) return;
                if (startIoBanner == null) {
                    startIoBanner = new Banner(MainActivity.this, new BannerListener() {
                        @Override
                        public void onReceiveAd(View banner) {
                            Log.d(TAG, "Start.io banner ad received successfully");
                            if (bannerContainer != null) {
                                bannerContainer.setVisibility(View.VISIBLE);
                                bannerContainer.bringToFront();
                            }
                        }

                        @Override
                        public void onFailedToReceiveAd(View banner) {
                            Log.w(TAG, "Start.io banner ad failed to receive ad");
                        }

                        @Override
                        public void onClick(View banner) {}

                        @Override
                        public void onImpression(View banner) {}
                    });

                    bannerContainer.removeAllViews();
                    bannerContainer.addView(startIoBanner);
                }
                bannerContainer.setVisibility(View.VISIBLE);
                bannerContainer.bringToFront();
                if (startIoBanner != null) {
                    startIoBanner.showBanner();
                }
            } catch (Throwable t) {
                Log.e(TAG, "Error displaying Start.io banner: " + t.getMessage(), t);
            }
        });
    }

    /**
     * Handle downloads triggered in WebView (blob:, data:, or remote)
     */
    private void handleWebViewDownload(String url, String contentDisposition, String mimeType) {
        if (url == null) return;
        runOnUiThread(() -> {
            try {
                if (url.startsWith("blob:")) {
                    String script = "javascript:(function() {" +
                            "  try {" +
                            "    fetch('" + url + "')" +
                            "      .then(function(r) { return r.blob(); })" +
                            "      .then(function(b) {" +
                            "        var reader = new FileReader();" +
                            "        reader.onloadend = function() {" +
                            "          if (window.AndroidApp && window.AndroidApp.handlePdfAction) {" +
                            "            window.AndroidApp.handlePdfAction(reader.result, 'FastPDF_Document.pdf', 'download');" +
                            "          }" +
                            "        };" +
                            "        reader.readAsDataURL(b);" +
                            "      })" +
                            "      .catch(function(err) { console.error('Blob fetch error: ', err); });" +
                            "  } catch(e) { console.error('Blob download failed: ', e); }" +
                            "})();";
                    if (webView != null) {
                        webView.evaluateJavascript(script, null);
                    }
                } else if (url.startsWith("data:")) {
                    String base64 = url.contains(",") ? url.substring(url.indexOf(",") + 1) : url;
                    new AndroidAppBridge().handlePdfAction(base64, "FastPDF_Document.pdf", "download");
                } else if (url.startsWith("http://") || url.startsWith("https://")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                }
            } catch (Throwable t) {
                Log.e(TAG, "Failed to handle download: " + t.getMessage(), t);
            }
        });
    }

    /**
     * Native JavaScript Interface for PDF Actions (Download, Open, Share) and Ads
     */
    public class AndroidAppBridge {

        @JavascriptInterface
        public void saveBase64File(String base64Data, String filename, String mimeType) {
            handlePdfAction(base64Data, filename, "download");
        }

        @JavascriptInterface
        public void handlePdfAction(String base64Data, String filename, String action) {
            runOnUiThread(() -> {
                try {
                    if (base64Data == null || base64Data.trim().isEmpty()) {
                        Toast.makeText(MainActivity.this, "Error: PDF data is empty", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    String safeFilename = filename;
                    if (safeFilename == null || safeFilename.trim().isEmpty()) {
                        safeFilename = "FastPDF_" + System.currentTimeMillis() + ".pdf";
                    }
                    if (!safeFilename.toLowerCase().endsWith(".pdf")) {
                        safeFilename = safeFilename + ".pdf";
                    }

                    // Clean base64 header if present
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    cleanBase64 = cleanBase64.trim().replaceAll("\\s+", "");

                    byte[] pdfBytes;
                    try {
                        pdfBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                    } catch (Throwable t) {
                        Log.e(TAG, "Failed to decode base64: " + t.getMessage());
                        Toast.makeText(MainActivity.this, "Failed to decode PDF data", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    if (pdfBytes == null || pdfBytes.length == 0) {
                        Toast.makeText(MainActivity.this, "Error: PDF bytes are empty", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    // 1. Save to Internal Cache for FileProvider Sharing / Opening
                    File cachePdfFile = new File(getCacheDir(), safeFilename);
                    try (FileOutputStream fos = new FileOutputStream(cachePdfFile)) {
                        fos.write(pdfBytes);
                        fos.flush();
                    }

                    String authority = getPackageName() + ".fileprovider";
                    Uri fileUri = FileProvider.getUriForFile(MainActivity.this, authority, cachePdfFile);

                    // 2. Save to App-Specific External Files Dir (guaranteed writable without permissions on all Android/Fire OS)
                    try {
                        File appDownloadsDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                        if (appDownloadsDir != null) {
                            if (!appDownloadsDir.exists()) {
                                appDownloadsDir.mkdirs();
                            }
                            File appPdfFile = new File(appDownloadsDir, safeFilename);
                            try (FileOutputStream fos = new FileOutputStream(appPdfFile)) {
                                fos.write(pdfBytes);
                                fos.flush();
                            }
                        }
                    } catch (Throwable t) {
                        Log.w(TAG, "App external downloads write failed: " + t.getMessage());
                    }

                    // 3. Save to Public Downloads folder for user accessibility
                    boolean savedToPublicDownloads = false;
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.Downloads.DISPLAY_NAME, safeFilename);
                            values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/FastPDF");
                            values.put(MediaStore.Downloads.IS_PENDING, 1);

                            Uri downloadCollection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                            Uri publicDownloadUri = getContentResolver().insert(downloadCollection, values);
                            if (publicDownloadUri != null) {
                                try (OutputStream os = getContentResolver().openOutputStream(publicDownloadUri)) {
                                    if (os != null) {
                                        os.write(pdfBytes);
                                        os.flush();
                                    }
                                }
                                values.clear();
                                values.put(MediaStore.Downloads.IS_PENDING, 0);
                                getContentResolver().update(publicDownloadUri, values, null, null);
                                savedToPublicDownloads = true;
                            }
                        } else {
                            File publicDownloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            File fastPdfFolder = new File(publicDownloadsDir, "FastPDF");
                            if (!fastPdfFolder.exists()) {
                                fastPdfFolder.mkdirs();
                            }
                            File publicFile = new File(fastPdfFolder, safeFilename);
                            try (FileOutputStream fos = new FileOutputStream(publicFile)) {
                                fos.write(pdfBytes);
                                fos.flush();
                                savedToPublicDownloads = true;
                            }
                            MediaScannerConnection.scanFile(MainActivity.this, new String[]{publicFile.getAbsolutePath()}, new String[]{"application/pdf"}, null);
                        }
                    } catch (Throwable t) {
                        Log.w(TAG, "Public downloads write failed, falling back to app files: " + t.getMessage());
                    }

                    if ("share".equalsIgnoreCase(action)) {
                        try {
                            Intent shareIntent = new Intent(Intent.ACTION_SEND);
                            shareIntent.setType("application/pdf");
                            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
                            shareIntent.setClipData(ClipData.newRawUri("PDF", fileUri));
                            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                            Intent chooser = Intent.createChooser(shareIntent, "Share PDF");
                            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                        } catch (ActivityNotFoundException e) {
                            Toast.makeText(MainActivity.this, "No app found to share PDF", Toast.LENGTH_SHORT).show();
                        } catch (Throwable t) {
                            Log.e(TAG, "Failed to share PDF: " + t.getMessage(), t);
                            Toast.makeText(MainActivity.this, "Could not share PDF", Toast.LENGTH_SHORT).show();
                        }
                    } else if ("open".equalsIgnoreCase(action)) {
                        try {
                            Intent openIntent = new Intent(Intent.ACTION_VIEW);
                            openIntent.setDataAndType(fileUri, "application/pdf");
                            openIntent.setClipData(ClipData.newRawUri("PDF", fileUri));
                            openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

                            Intent chooser = Intent.createChooser(openIntent, "Open PDF");
                            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                        } catch (ActivityNotFoundException e) {
                            Toast.makeText(MainActivity.this, "No PDF viewer app installed", Toast.LENGTH_LONG).show();
                        } catch (Throwable t) {
                            Log.e(TAG, "Failed to open PDF: " + t.getMessage(), t);
                            Toast.makeText(MainActivity.this, "Could not open PDF", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        // Download / Save Action
                        String msg = savedToPublicDownloads
                                ? "Saved to Downloads/FastPDF: " + safeFilename
                                : "PDF saved successfully: " + safeFilename;
                        Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
                    }
                } catch (Throwable t) {
                    Log.e(TAG, "Error handling PDF action: " + t.getMessage(), t);
                    Toast.makeText(MainActivity.this, "Error saving PDF: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void showInterstitial() {
            runOnUiThread(() -> {
                try {
                    StartAppAd.showAd(MainActivity.this);
                } catch (Throwable t) {
                    Log.e(TAG, "StartAppAd showAd error: " + t.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void showBanner(String position) {
            loadAndShowBanner();
        }

        @JavascriptInterface
        public void hideBanner() {
            runOnUiThread(() -> {
                try {
                    if (bannerContainer != null) {
                        bannerContainer.setVisibility(View.GONE);
                    }
                    if (startIoBanner != null) {
                        startIoBanner.hideBanner();
                    }
                } catch (Throwable ignored) {}
            });
        }

        @JavascriptInterface
        public void openExternalUrl(String url) {
            runOnUiThread(() -> {
                try {
                    if (url != null && !url.trim().isEmpty()) {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                    }
                } catch (Throwable t) {
                    Log.e(TAG, "Failed to open external url: " + t.getMessage(), t);
                }
            });
        }
    }

    /**
     * Native JavaScript Interface exposed for Start.io Ads
     */
    public class StartAppBridge {

        @JavascriptInterface
        public boolean isAvailable() {
            return true;
        }

        @JavascriptInterface
        public void init(String appId, boolean testMode) {
            runOnUiThread(() -> {
                try {
                    StartAppSDK.setTestAdsEnabled(false);
                    loadAndShowBanner();
                } catch (Throwable t) {
                    Log.e(TAG, "StartAppSDK setTestAdsEnabled error: " + t.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void showBanner(String position) {
            loadAndShowBanner();
        }

        @JavascriptInterface
        public void hideBanner() {
            runOnUiThread(() -> {
                try {
                    if (bannerContainer != null) {
                        bannerContainer.setVisibility(View.GONE);
                    }
                    if (startIoBanner != null) {
                        startIoBanner.hideBanner();
                    }
                } catch (Throwable ignored) {}
            });
        }

        @JavascriptInterface
        public void showInterstitial() {
            runOnUiThread(() -> {
                try {
                    StartAppAd.showAd(MainActivity.this);
                } catch (Throwable t) {
                    Log.e(TAG, "StartAppAd showAd error: " + t.getMessage());
                }
            });
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            try {
                webView.onPause();
            } catch (Throwable ignored) {}
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            try {
                webView.onResume();
            } catch (Throwable ignored) {}
        }
        loadAndShowBanner();
    }

    @Override
    protected void onDestroy() {
        try {
            if (bannerContainer != null) {
                bannerContainer.removeAllViews();
            }
            if (startIoBanner != null) {
                startIoBanner = null;
            }
            if (webView != null) {
                webView.destroy();
                webView = null;
            }
        } catch (Throwable ignored) {}
        super.onDestroy();
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
