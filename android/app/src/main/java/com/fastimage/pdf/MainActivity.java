package com.fastimage.pdf;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
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
        StartAppSDK.init(this, STARTIO_APP_ID, false);
        
        // 2. Enable Test Ads during development/testing
        StartAppSDK.setTestAdsEnabled(true);

        // Disable automatic full-screen / splash ads to preserve clean UX
        StartAppAd.disableSplash();

        // 3. Build Layout: Main WebView + Dedicated Bottom Banner Container
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

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Register Android JavaScriptInterface Bridge for Start.io
        webView.addJavascriptInterface(new StartAppBridge(), "StartAppAndroid");
        webView.setWebViewClient(new WebViewClient());

        // Attach WebChromeClient to reliably support HTML5 input type="file" image pickers
        webView.setWebChromeClient(new WebChromeClient() {
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

        // Load compiled React Single Page App
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
                StartAppSDK.setTestAdsEnabled(testMode);
            });
        }

        @JavascriptInterface
        public void showBanner(String position) {
            runOnUiThread(() -> {
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
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            runOnUiThread(() -> {
                if (bannerContainer != null) {
                    bannerContainer.setVisibility(View.GONE);
                }
                if (startIoBanner != null) {
                    startIoBanner.hideBanner();
                }
            });
        }

        @JavascriptInterface
        public void showInterstitial() {
            runOnUiThread(() -> {
                StartAppAd.showAd(MainActivity.this);
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
