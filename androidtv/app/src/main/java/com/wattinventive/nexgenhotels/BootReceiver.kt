package com.wattinventive.nexgenhotels

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Hotel mode: open the app when the TV finishes booting.
 *
 * Android 9 and older allow this outright. Android 10+ block activity starts
 * from the background unless "Display over other apps" is granted — or the app
 * is already the default Home, in which case the system opens it anyway.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!HotelMode.isOn(context)) {
            return
        }
        context.startActivity(
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
