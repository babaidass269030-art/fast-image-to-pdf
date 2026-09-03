package com.fastimage.pdf;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
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
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
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
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
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
    private WebChromeClient.FileChooserParams pendingFileChooserParams;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Initialize Start.io Android SDK with official App ID and disable return ads
        try {
            StartAppSDK.init(this, STARTIO_APP_ID, false);
            StartAppSDK.setTestAdsEnabled(true);
            StartAppAd.disableSplash();
        } catch (Exception e) {
            Log.e(TAG, "Start.io SDK init error: " + e.getMessage());
        }

        // 2. Build Layout: Main WebView + Dedicated Bottom Banner Container
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

        // Enable web contents debugging for troubleshooting
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

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

        // Register Android JavaScriptInterface Bridges
        webView.addJavascriptInterface(new StartAppBridge(), "StartAppAndroid");
        webView.addJavascriptInterface(new AndroidAppBridge(), "AndroidApp");

        // Custom WebViewClient with logging and error reporting
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "Page loaded successfully: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    Log.e(TAG, "Main frame load error: " + error.toString());
                }
            }
        });

        // WebChromeClient for console logging and HTML5 File Chooser with native Camera support
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG + "-JS", consoleMessage.message() + " -- From line "
                        + consoleMessage.lineNumber() + " of "
                        + consoleMessage.sourceId());
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallbackParam, FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                }
                filePathCallback = filePathCallbackParam;

                // Check and request camera permission if capture is enabled and permission not yet granted
                if (fileChooserParams != null && fileChooserParams.isCaptureEnabled()) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        pendingFileChooserParams = fileChooserParams;
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST_CODE);
                        return true;
                    }
                }

                launchFileChooser(fileChooserParams);
                return true;
            }
        });

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
        setContentView(rootLayout);

        // Load compiled React Single Page App directly from assets
        webView.loadUrl("file:///android_asset/index.html");
    }

    /**
     * Create a temporary file Uri for Camera capture via FileProvider
     */
    private Uri createCameraImageUri() {
        try {
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String imageFileName = "JPEG_" + timeStamp + "_";
            File storageDir = getExternalCacheDir();
            if (storageDir == null) {
                storageDir = getCacheDir();
            }
            File imageFile = File.createTempFile(imageFileName, ".jpg", storageDir);
            return FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", imageFile);
        } catch (IOException e) {
            Log.e(TAG, "Failed to create temp camera file: " + e.getMessage());
            return null;
        }
    }

    /**
     * Launch File Chooser or Camera Intent
     */
    private void launchFileChooser(WebChromeClient.FileChooserParams fileChooserParams) {
        boolean isCapture = fileChooserParams != null && fileChooserParams.isCaptureEnabled();
        Intent takePictureIntent = null;
        cameraPhotoUri = createCameraImageUri();

        if (cameraPhotoUri != null) {
            takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
            takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        if (isCapture) {
            // "Take Photo" button with capture="environment" -> Direct camera trigger
            if (takePictureIntent != null && takePictureIntent.resolveActivity(getPackageManager()) != null) {
                try {
                    startActivityForResult(takePictureIntent, FILE_CHOOSER_RESULT_CODE);
                    return;
                } catch (ActivityNotFoundException e) {
                    Log.e(TAG, "Direct camera launch failed: " + e.getMessage());
                }
            }
        }

        // Standard gallery/photo selection with camera as an additional option
        Intent contentSelectionIntent;
        if (fileChooserParams != null) {
            contentSelectionIntent = fileChooserParams.createIntent();
        } else {
            contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
            contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
            contentSelectionIntent.setType("image/*");
        }

        Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
        chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
        chooserIntent.putExtra(Intent.EXTRA_TITLE, "Select Images");

        if (takePictureIntent != null && takePictureIntent.resolveActivity(getPackageManager()) != null) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePictureIntent});
        }

        try {
            startActivityForResult(chooserIntent, FILE_CHOOSER_RESULT_CODE);
        } catch (ActivityNotFoundException e) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
                filePathCallback = null;
            }
            cameraPhotoUri = null;
            Log.e(TAG, "Activity not found for file chooser: " + e.getMessage());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (filePathCallback != null) {
                launchFileChooser(pendingFileChooserParams);
                pendingFileChooserParams = null;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK) {
                    if (data == null || (data.getData() == null && data.getClipData() == null)) {
                        // Camera capture saved directly into cameraPhotoUri
                        if (cameraPhotoUri != null) {
                            results = new Uri[]{cameraPhotoUri};
                        }
                    } else {
                        results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                        if (results == null && cameraPhotoUri != null) {
                            results = new Uri[]{cameraPhotoUri};
                        }
                    }
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
                cameraPhotoUri = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    /**
     * Native JavaScript Interface for PDF Actions (Download, Open, Share)
     */
    public class AndroidAppBridge {

        @JavascriptInterface
        public void handlePdfAction(String base64Data, String filename, String action) {
            runOnUiThread(() -> {
                try {
                    byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
                    File docsDir = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
                    if (docsDir == null) {
                        docsDir = getFilesDir();
                    }
                    File pdfDir = new File(docsDir, "FastPDF");
                    if (!pdfDir.exists()) {
                        pdfDir.mkdirs();
                    }
                    File pdfFile = new File(pdfDir, filename);
                    FileOutputStream fos = new FileOutputStream(pdfFile);
                    fos.write(pdfBytes);
                    fos.flush();
                    fos.close();

                    Uri fileUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", pdfFile);

                    if ("share".equals(action)) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("application/pdf");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        Intent chooser = Intent.createChooser(shareIntent, "Share PDF");
                        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(chooser);
                    } else if ("open".equals(action)) {
                        Intent openIntent = new Intent(Intent.ACTION_VIEW);
                        openIntent.setDataAndType(fileUri, "application/pdf");
                        openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        Intent chooser = Intent.createChooser(openIntent, "Open PDF");
                        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(chooser);
                    } else {
                        Toast.makeText(MainActivity.this, "Saved: " + pdfFile.getName(), Toast.LENGTH_SHORT).show();
                        MediaScannerConnection.scanFile(MainActivity.this, new String[]{pdfFile.getAbsolutePath()}, new String[]{"application/pdf"}, null);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error handling PDF action: " + e.getMessage());
                    Toast.makeText(MainActivity.this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    /**
     * Native JavaScript Interface exposed to React Web Application for Start.io Ads
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
                    StartAppSDK.setTestAdsEnabled(testMode);
                } catch (Exception e) {
                    Log.e(TAG, "StartAppSDK setTestAdsEnabled error: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void showBanner(String position) {
            runOnUiThread(() -> {
                try {
                    if (startIoBanner == null) {
                        startIoBanner = new Banner(MainActivity.this, new BannerListener() {
                            @Override
                            public void onReceiveAd(View banner) {
                                if (bannerContainer != null) {
                                    bannerContainer.setVisibility(View.VISIBLE);
                                }
                            }

                            @Override
                            public void onFailedToReceiveAd(View banner) {
                                if (bannerContainer != null) {
                                    bannerContainer.setVisibility(View.GONE);
                                }
                            }

                            @Override
                            public void onClick(View banner) {
                            }

                            @Override
                            public void onImpression(View banner) {
                            }
                        });

                        bannerContainer.removeAllViews();
                        bannerContainer.addView(startIoBanner);
                    } else {
                        bannerContainer.setVisibility(View.VISIBLE);
                        startIoBanner.showBanner();
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Start.io banner error: " + e.getMessage());
                }
            });
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
                } catch (Exception e) {
                    Log.e(TAG, "Start.io hideBanner error: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void showInterstitial() {
            runOnUiThread(() -> {
                try {
                    StartAppAd.showAd(MainActivity.this);
                } catch (Exception e) {
                    Log.e(TAG, "StartAppAd showAd error: " + e.getMessage());
                }
            });
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
