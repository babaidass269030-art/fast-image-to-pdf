package com.fastimage.pdf;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
import androidx.appcompat.app.AppCompatActivity;

import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.StartAppSDK;
import com.startapp.sdk.ads.banner.Banner;
import com.startapp.sdk.ads.banner.BannerListener;

public class MainActivity extends AppCompatActivity {

    public static final String TAG = "FastPDF";
    public static final String STARTIO_APP_ID = "207781120";
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;

    private WebView webView;
    private FrameLayout bannerContainer;
    private Banner startIoBanner;
    private ValueCallback<Uri[]> filePathCallback;

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

        // Register Android JavaScriptInterface Bridge for Start.io
        webView.addJavascriptInterface(new StartAppBridge(), "StartAppAndroid");

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

        // WebChromeClient for console logging and HTML5 File Chooser
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

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    Log.e(TAG, "Activity not found for file chooser: " + e.getMessage());
                    return false;
                }
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

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                filePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    /**
     * Native JavaScript Interface exposed to React Web Application
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
