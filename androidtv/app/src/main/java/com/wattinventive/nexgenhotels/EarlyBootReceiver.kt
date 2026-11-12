package com.wattinventive.nexgenhotels

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.os.UserManager

/**
 * Hotel mode: open the app as early in a boot as Android allows.
 *
 * BOOT_COMPLETED goes to every listening app one at a time; on a Xiaomi
 * MiTV-MOOQ1 (226 of them) it reached the app ~40 s after the TV's Home was up,
 * even at priority 999. LOCKED_BOOT_COMPLETED comes ~4 s earlier and only to
 * direct-boot-aware receivers (5 there), so it arrives at once — on that TV the
 * app now opens before the Home screen ever shows.
 *
 * At that moment the user's storage may still be locked — a TV without a PIN
 * unlocks within seconds — so wait for it before reading Hotel mode, then
 * insist briefly in case the TV's launcher lands on top. BootReceiver stays as
 * the fallback for TVs where this never arrives.
 */
class EarlyBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val app = context.applicationContext
        val pending = goAsync()
        Thread {
            try {
                val users = app.getSystemService(UserManager::class.java)
                val unlockBy = SystemClock.elapsedRealtime() + UNLOCK_WAIT_MS
                while (!users.isUserUnlocked && SystemClock.elapsedRealtime() < unlockBy) {
                    SystemClock.sleep(POLL_MS)
                }
                if (users.isUserUnlocked && HotelMode.isOn(app)) {
                    // This process started while storage was locked, so its onCreate
                    // skipped the overlay. Without it the watcher stays "cached" and the
                    // low-memory killer took it ~20 s into the boot storm.
                    (app as NexgenApplication).syncOverlay()
                    HotelMode.bringToFrontAndInsist(app)
                }
            } finally {
                pending.finish()
            }
        }.start()
    }

    private companion object {
        // With bringToFrontAndInsist, well inside the 60 s a background broadcast may take.
        const val UNLOCK_WAIT_MS = 20_000L
        const val POLL_MS = 250L
    }
}
