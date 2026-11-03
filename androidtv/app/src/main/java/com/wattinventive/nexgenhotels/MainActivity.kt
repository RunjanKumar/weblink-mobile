package com.wattinventive.nexgenhotels

import android.annotation.SuppressLint
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat

/**
 * One full-screen WebView running the TV web build (`npm run aab` copies
 * web-build-androidtv/ into assets/www/). Everything the guest sees is the web
 * app; this class only hosts it:
 *  - serves the bundle from the APK over a real https origin (WebViewAssetLoader),
 *  - exposes `window.NexgenTV` (TvBridge) and tags the user agent so the web
 *    app knows it is in this APK,
 *  - forwards the remote's Back to the web app as a `nexgen:back` event,
 *  - shows Razorpay's popups (3-D Secure, netbanking) over the app.
 */
class MainActivity : ComponentActivity() {

    private lateinit var root: FrameLayout
    private var webView: WebView? = null

    /** A window the web app opened with window.open — only Razorpay does. */
    private var popup: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root = FrameLayout(this)
        setContentView(root)

        // The bundle needs Chromium 68+ (webpack target es2018, babel chrome 68).
        // An older WebView would only show a black screen, so say what to do.
        if (!webViewIsRecentEnough()) {
            showMessage(getString(R.string.update_webview))
            return
        }
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true) // chrome://inspect
        }

        val wv = try {
            createAppWebView()
        } catch (e: RuntimeException) {
            // No WebView provider installed / it failed to load.
            Log.e(TAG, "Could not create the WebView", e)
            showMessage(getString(R.string.update_webview))
            return
        }
        webView = wv
        root.addView(wv, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        wv.requestFocus()

        // The remote's Back never reaches the page as a keydown on Android TV,
        // so hand it over explicitly. The web app decides: close a dialog, pop a
        // screen, or at the root call NexgenTV.rootBack().
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (popup != null) {
                    closePopup()
                } else {
                    wv.evaluateJavascript("window.dispatchEvent(new Event('nexgen:back'))", null)
                }
            }
        })

        // Always the start page — also after recreate(), where the old page state
        // is gone with the crashed renderer.
        wv.loadUrl(START_URL)
    }

    /**
     * The remote's OK is DPAD_CENTER. The web app treats Enter (keyCode 13) as OK,
     * exactly as on LG / Samsung, so send it as Enter on every WebView version.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
            return super.dispatchKeyEvent(
                KeyEvent(
                    event.downTime, event.eventTime, event.action, KeyEvent.KEYCODE_ENTER,
                    event.repeatCount, event.metaState, event.deviceId, event.scanCode,
                    event.flags, event.source,
                ),
            )
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onDestroy() {
        closePopup()
        webView?.let {
            root.removeView(it)
            it.destroy()
        }
        webView = null
        super.onDestroy()
    }

    private fun webViewIsRecentEnough(): Boolean {
        val major = WebViewCompat.getCurrentWebViewPackage(this)
            ?.versionName?.substringBefore('.')?.toIntOrNull()
            ?: return true // unknown: try anyway
        return major >= MIN_CHROMIUM
    }

    private fun showMessage(text: String) {
        root.addView(
            TextView(this).apply {
                this.text = text
                gravity = Gravity.CENTER
                textSize = 28f
                setTextColor(ContextCompat.getColor(context, R.color.message_text))
                setPadding(96, 96, 96, 96)
            },
            FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT),
        )
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private fun createAppWebView(): WebView {
        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        return WebView(this).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.boot_background))
            secure(settings)
            settings.domStorageEnabled = true // the pairing token lives in localStorage
            // web/index.html pins the viewport to 1920 for this build; without
            // these the WebView lays out at 960 CSS px (DPR 2) and ignores it.
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.mediaPlaybackRequiresUserGesture = false
            // Razorpay opens 3-D Secure / netbanking with window.open.
            settings.setSupportMultipleWindows(true)
            settings.javaScriptCanOpenWindowsAutomatically = true
            // How the web app recognises this APK (IS_ANDROID_TV_APP).
            settings.userAgentString =
                "${settings.userAgentString} NexgenHotelsTV/${BuildConfig.VERSION_NAME}"
            addJavascriptInterface(TvBridge(this@MainActivity), "NexgenTV")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? = assets.shouldInterceptRequest(request.url)

                // API 24+.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) =
                    request.isForMainFrame && !isAppPage(request.url)

                // API 23 calls only this overload.
                @Deprecated("Superseded on API 24+ by the WebResourceRequest overload")
                override fun shouldOverrideUrlLoading(view: WebView, url: String) =
                    !isAppPage(url.toUri())

                // API 26+. The renderer crashed or was killed for memory: start
                // fresh instead of leaving a dead page (or a crash loop).
                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    Log.w(TAG, "WebView renderer gone (crash=${detail.didCrash()}), restarting")
                    root.removeView(view)
                    view.destroy()
                    webView = null
                    recreate()
                    return true
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onCreateWindow(
                    view: WebView,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: Message,
                ): Boolean {
                    openPopup(resultMsg)
                    return true
                }
            }
        }
    }

    /**
     * Razorpay's window.open, as a WebView over the app. Without this the popup
     * would replace the app's own page. Back or the page's window.close() closes it.
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun openPopup(resultMsg: Message) {
        closePopup()
        val child = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            secure(settings)
            settings.domStorageEnabled = true
            settings.userAgentString = webView?.settings?.userAgentString
            webViewClient = object : WebViewClient() {
                // Bank pages live on any https host; app hand-offs (upi://,
                // intent://) have nowhere to go on a TV.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) =
                    !isWeb(request.url)

                @Deprecated("Superseded on API 24+ by the WebResourceRequest overload")
                override fun shouldOverrideUrlLoading(view: WebView, url: String) =
                    !isWeb(url.toUri())

                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    if (view === popup) {
                        closePopup()
                    }
                    return true
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onCloseWindow(window: WebView) {
                    if (window === popup) {
                        closePopup()
                    }
                }
            }
        }
        popup = child
        root.addView(child, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        child.requestFocus()
        (resultMsg.obj as WebView.WebViewTransport).webView = child
        resultMsg.sendToTarget()
    }

    private fun closePopup() {
        val child = popup ?: return
        popup = null
        root.removeView(child)
        child.destroy()
        webView?.requestFocus()
    }

    companion object {
        private const val TAG = "NexgenHotels"
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val START_URL = "https://$APP_HOST/assets/www/index.html"
        private const val MIN_CHROMIUM = 68

        /** No file:// or content:// — the bundle comes from WebViewAssetLoader (Play flags file access). */
        private fun secure(settings: WebSettings) {
            settings.javaScriptEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
        }

        private fun isWeb(uri: Uri) = uri.scheme == "https" || uri.scheme == "http"

        /** The top-level page may only be the app itself or Razorpay's checkout. */
        private fun isAppPage(uri: Uri): Boolean {
            val host = uri.host ?: return false
            return uri.scheme == "https" &&
                (host == APP_HOST || host == "razorpay.com" || host.endsWith(".razorpay.com"))
        }
    }
}
