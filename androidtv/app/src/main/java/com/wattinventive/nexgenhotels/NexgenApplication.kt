package com.wattinventive.nexgenhotels

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.UserManager
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import java.io.File

/**
 * Two processes:
 *  - the main one runs the WebView (~150 MB on a TV);
 *  - ":watch" is tiny and exists only for Hotel mode. It hosts the boot
 *    receivers, brings the app forward when the TV wakes, and holds a 1×1
 *    transparent overlay window that keeps it alive.
 *
 * Why: SCREEN_ON reaches only a running process, and minutes into standby a
 * cached app is frozen or killed. The overlay ("Display over other apps", which
 * Hotel mode needs anyway) makes a process perceptible — not cached, not frozen
 * — without a foreground service and its Play declaration. On a low-RAM TV
 * (Xiaomi MiTV-MOOQ1, 1.8 GB) the low-memory killer still took the whole app
 * while YouTube played, so the job moved out of the WebView process: the small
 * watcher survives where 150 MB would not, and the main process, no longer kept
 * alive by the overlay, can be reclaimed while the guest is elsewhere.
 */
class NexgenApplication : Application() {

    private var overlay: View? = null

    private val isWatcher by lazy { currentProcessName().endsWith(WATCH_SUFFIX) }

    override fun onCreate() {
        super.onCreate()
        if (!isWatcher) {
            return
        }
        registerReceiver(
            object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    if (HotelMode.isOn(context)) {
                        // The launcher reopens its Home just after a wake.
                        Thread { HotelMode.bringToFrontAndInsist(context) }.start()
                    }
                }
            },
            IntentFilter(Intent.ACTION_SCREEN_ON),
        )
        // EarlyBootReceiver can start this process before the user's storage is
        // unlocked, and Hotel mode lives there; it syncs again once unlocked.
        if (getSystemService(UserManager::class.java).isUserUnlocked) {
            syncOverlay()
        }
    }

    /**
     * Watcher process only: adds or removes the overlay to match Hotel mode and
     * the permission. Any thread. The main process asks for this through
     * HotelMode.syncWatcher.
     */
    fun syncOverlay() {
        if (!isWatcher) {
            return
        }
        Handler(Looper.getMainLooper()).post {
            val wanted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                HotelMode.isOn(this) && Settings.canDrawOverlays(this)
            val windows = getSystemService(WindowManager::class.java)
            val current = overlay
            if (wanted && current == null) {
                val view = View(this)
                try {
                    windows.addView(view, overlayParams())
                    overlay = view
                } catch (e: RuntimeException) {
                    // Permission revoked between the check and here.
                    Log.w(TAG, "Could not add the keep-awake overlay", e)
                }
            } else if (!wanted && current != null) {
                windows.removeView(current)
                overlay = null
            }
        }
    }

    private fun overlayParams() = WindowManager.LayoutParams(
        1,
        1,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
        PixelFormat.TRANSLUCENT,
    ).apply { gravity = Gravity.TOP or Gravity.START }

    private fun currentProcessName(): String =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getProcessName()
        } else {
            runCatching { File("/proc/self/cmdline").readText().trim('\u0000', ' ') }.getOrDefault("")
        }

    companion object {
        private const val TAG = "NexgenHotels"

        /** android:process of the watcher components in AndroidManifest.xml. */
        const val WATCH_SUFFIX = ":watch"
    }
}
