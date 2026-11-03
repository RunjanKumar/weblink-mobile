package com.wattinventive.nexgenhotels

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.core.content.edit
import org.json.JSONObject

/**
 * Hotel mode: the app becomes the TV's home screen and opens on power-on.
 * Staff switch it per TV in the admin panel; the web app relays that here.
 *
 * On: the HomeAlias launcher entry is enabled, so the TV offers this app as its
 * Home, and BootReceiver opens the app after boot. It never opens the Home
 * chooser itself — on a TV with a default Home already set that would just
 * open the stock launcher and the guest would watch the app disappear.
 */
object HotelMode {
    private const val PREFS = "hotel_mode"
    private const val KEY_ON = "on"

    fun isOn(ctx: Context): Boolean = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ON, false)

    fun set(ctx: Context, on: Boolean) {
        if (isOn(ctx) == on) {
            return
        }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit { putBoolean(KEY_ON, on) }
        ctx.packageManager.setComponentEnabledSetting(
            ComponentName(ctx, "${ctx.packageName}.HomeAlias"),
            if (on) {
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            } else {
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED
            },
            PackageManager.DONT_KILL_APP,
        )
    }

    /** True when the TV's default Home is this app (staff picked it → Always). */
    fun isDefaultHome(ctx: Context): Boolean = ctx.packageManager.resolveActivity(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
        PackageManager.MATCH_DEFAULT_ONLY,
    )?.activityInfo?.packageName == ctx.packageName

    fun statusJson(ctx: Context): String = JSONObject()
        .put("on", isOn(ctx))
        .put("defaultHome", isDefaultHome(ctx))
        .put("canDrawOverlays", Settings.canDrawOverlays(ctx))
        .toString()
}
