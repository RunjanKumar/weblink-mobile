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

    /** What pressing Home does on this TV right now — see [homeChoice]. */
    private const val HOME_SELF = "self"
    private const val HOME_CHOOSER = "chooser"
    private const val HOME_DEFAULT = "default"
    private const val HOME_LOCKED = "locked"

    fun isOn(ctx: Context): Boolean = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ON, false)

    fun set(ctx: Context, on: Boolean) {
        if (isOn(ctx) != on) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit { putBoolean(KEY_ON, on) }
        }
        // Reconciled on every call, not only on a change: whether another Home
        // exists can change between calls (staff re-enabling the stock launcher).
        //
        // Off normally hands Home back to the TV. But a hotel that disabled the
        // stock launcher over adb (the only way to make this app the Home on a
        // Google/Android TV launcher) would then be left with Android's empty
        // FallbackHome — a black screen nothing on the remote can leave. So the
        // alias stays on until another launcher is there to take over.
        val wantAlias = on || !otherHomeAvailable(ctx)
        val alias = ComponentName(ctx, "${ctx.packageName}.HomeAlias")
        val pm = ctx.packageManager
        val isEnabled = pm.getComponentEnabledSetting(alias) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        if (wantAlias != isEnabled) {
            pm.setComponentEnabledSetting(
                alias,
                if (wantAlias) {
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                } else {
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                },
                PackageManager.DONT_KILL_APP,
            )
        }
    }

    private fun homeIntent() = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)

    /**
     * A real launcher besides this app. Android's own FallbackHome (an empty
     * screen, negative priority) does not count.
     */
    private fun otherHomeAvailable(ctx: Context): Boolean =
        ctx.packageManager.queryIntentActivities(homeIntent(), PackageManager.MATCH_DEFAULT_ONLY)
            .any { it.activityInfo.packageName != ctx.packageName && it.priority >= 0 }

    /**
     * What the Home button opens, as far as Hotel mode is concerned:
     *  - "self":    this app (staff picked it → Always). Done.
     *  - "chooser": Android asks which Home to use — "Set as Home app" works.
     *  - "default": another launcher was made the default; staff clear its
     *               defaults (Settings → Apps → it → Clear defaults) first.
     *  - "locked":  the TV's own launcher outranks every other Home (Google TV:
     *               priority 2 vs our 0), so no chooser ever appears. Only the
     *               power-on path is left (BootReceiver + overlay permission).
     * Paired with the launcher's label for the staff message.
     */
    private fun homeChoice(ctx: Context): Pair<String, String?> {
        val pm = ctx.packageManager
        val resolved = pm.resolveActivity(homeIntent(), PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo
            ?: return HOME_CHOOSER to null
        if (resolved.packageName == ctx.packageName) {
            return HOME_SELF to null
        }
        // The system's own "pick an app" activity: no default, equal ranks.
        if (resolved.packageName == "android" || resolved.name.endsWith("ResolverActivity")) {
            return HOME_CHOOSER to null
        }
        val label = resolved.loadLabel(pm).toString()
        val candidates = pm.queryIntentActivities(homeIntent(), PackageManager.MATCH_DEFAULT_ONLY)
        val theirs = candidates.firstOrNull { it.activityInfo.packageName == resolved.packageName }?.priority ?: 0
        val ours = candidates.firstOrNull { it.activityInfo.packageName == ctx.packageName }?.priority ?: 0
        return (if (theirs > ours) HOME_LOCKED else HOME_DEFAULT) to label
    }

    /** True when the TV's default Home is this app (staff picked it → Always). */
    fun isDefaultHome(ctx: Context): Boolean = homeChoice(ctx).first == HOME_SELF

    fun statusJson(ctx: Context): String {
        val (home, homeLabel) = homeChoice(ctx)
        return JSONObject()
            .put("on", isOn(ctx))
            .put("defaultHome", home == HOME_SELF)
            .put("home", home)
            .put("homeLabel", homeLabel ?: JSONObject.NULL)
            .put("canDrawOverlays", Settings.canDrawOverlays(ctx))
            .toString()
    }
}
