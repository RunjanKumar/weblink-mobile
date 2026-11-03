package com.wattinventive.nexgenhotels

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.net.toUri

/**
 * `window.NexgenTV` — what the web app may ask of the TV. Mirrored by
 * `NexgenTvBridge` in src/services/tvPlatform.web.ts; keep the two in sync.
 *
 * JavaScript calls arrive on a WebView background thread, so anything that
 * touches the UI or starts an activity hops to the main thread.
 */
class TvBridge(private val activity: MainActivity) {

    /**
     * ANDROID_ID: stable per TV + signing key. The backend stores it as the
     * device's `duid` and replaces the old record when the same TV pairs again.
     */
    @JavascriptInterface
    fun deviceId(): String =
        Settings.Secure.getString(activity.contentResolver, Settings.Secure.ANDROID_ID) ?: ""

    /** "TCL 43P635" — shown in the admin panel's TV list. */
    @JavascriptInterface
    fun deviceModel(): String = "${Build.MANUFACTURER} ${Build.MODEL}".trim()

    /**
     * Back on the web app's root screen. Normally leave to the TV's Home — Google's
     * TV quality rule TV-DB. In Hotel mode this app IS the Home, so stay.
     */
    @JavascriptInterface
    fun rootBack() = activity.runOnUiThread {
        if (!HotelMode.isOn(activity)) {
            activity.finish()
        }
    }

    /** Driven by the admin panel's per-TV switch (via /v1/tv/state). */
    @JavascriptInterface
    fun setHotelMode(on: Boolean) = activity.runOnUiThread { HotelMode.set(activity, on) }

    /** JSON: {"on", "defaultHome", "canDrawOverlays"}. */
    @JavascriptInterface
    fun hotelModeStatus(): String = HotelMode.statusJson(activity)

    /**
     * Android's Home picker, for staff to choose this app → Always. If the TV
     * already has a default Home this just opens it; staff clear that default
     * in Settings → Apps first (see the admin panel's help text).
     */
    @JavascriptInterface
    fun openHomeChooser() = activity.runOnUiThread {
        activity.startActivity(
            Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    /** False when the TV has no "Display over other apps" screen (many don't). */
    @JavascriptInterface
    fun openOverlaySettings(): Boolean = try {
        activity.startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                "package:${activity.packageName}".toUri(),
            ),
        )
        true
    } catch (e: ActivityNotFoundException) {
        false
    }
}
