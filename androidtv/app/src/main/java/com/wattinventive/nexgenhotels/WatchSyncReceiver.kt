package com.wattinventive.nexgenhotels

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Runs in the ":watch" process. The main process sends it an explicit broadcast
 * whenever Hotel mode or the overlay permission may have changed; receiving it
 * also starts the watcher if the TV killed it.
 */
class WatchSyncReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        (context.applicationContext as NexgenApplication).syncOverlay()
    }
}
