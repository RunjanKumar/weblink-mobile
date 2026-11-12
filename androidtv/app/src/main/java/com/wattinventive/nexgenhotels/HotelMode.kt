package com.wattinventive.nexgenhotels

import android.app.ActivityManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
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
    private const val KEY_GRANTED_BOOT = "overlay_granted_boot"
    private const val NOT_RECORDED = -1

    /** What pressing Home does on this TV right now — see [homeChoice]. */
    private const val HOME_SELF = "self"
    private const val HOME_CHOOSER = "chooser"
    private const val HOME_DEFAULT = "default"
    private const val HOME_LOCKED = "locked"

    /**
     * Written by the main process, read by the ":watch" one too (see
     * NexgenApplication): MODE_MULTI_PROCESS reloads the file when it changed,
     * where MODE_PRIVATE would keep serving the watcher a stale copy.
     */
    @Suppress("DEPRECATION")
    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_MULTI_PROCESS)

    fun isOn(ctx: Context): Boolean = prefs(ctx).getBoolean(KEY_ON, false)

    fun set(ctx: Context, on: Boolean) {
        if (isOn(ctx) != on) {
            // Committed: the watcher reads it as soon as syncWatcher reaches it.
            prefs(ctx).edit(commit = true) { putBoolean(KEY_ON, on) }
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
        syncWatcher(ctx)
    }

    /** Tells the ":watch" process to match Hotel mode — and starts it if the TV killed it. */
    fun syncWatcher(ctx: Context) {
        // Foreground queue: the background one is busy for minutes after a boot,
        // delivering BOOT_COMPLETED to every app (226 on a Xiaomi MiTV-MOOQ1).
        ctx.sendBroadcast(
            Intent(ctx, WatchSyncReceiver::class.java).addFlags(Intent.FLAG_RECEIVER_FOREGROUND),
        )
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

    /** Opens the app over whatever is on screen. A no-op when it is already in front. */
    fun bringToFront(ctx: Context) {
        ctx.startActivity(Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** The app's activity (main process) is what the TV shows right now. Callable from either process. */
    fun isInFront(ctx: Context): Boolean =
        ctx.getSystemService(ActivityManager::class.java).runningAppProcesses
            ?.firstOrNull { it.processName == ctx.packageName }
            ?.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND

    /**
     * After a power-on or wake the TV's launcher starts its own Home a moment
     * after the app does and lands on top (Android TV launcher, seen on a Xiaomi
     * MiTV-MOOQ1: app at +0.6 s, Home at +0.7 s after the screen came on). So
     * check again a few times over [INSIST_FOR_MS] and come back to the front.
     * Blocks the calling thread — call it off the main thread.
     */
    fun bringToFrontAndInsist(ctx: Context) {
        val until = SystemClock.elapsedRealtime() + INSIST_FOR_MS
        while (SystemClock.elapsedRealtime() < until && isOn(ctx)) {
            if (!isInFront(ctx)) {
                bringToFront(ctx)
            }
            SystemClock.sleep(INSIST_EVERY_MS)
        }
    }

    private const val INSIST_FOR_MS = 12_000L
    private const val INSIST_EVERY_MS = 1_500L

    /** Android 10+ block background activity starts unless this permission is granted. */
    private fun needsOverlay(home: String) = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && home != HOME_SELF

    /**
     * True from the moment "Display over other apps" is seen as granted until the
     * TV has booted once more. Android writes that grant to disk lazily: a power
     * cut (a room key-card pulled) minutes after "Allow" loses it, while a clean
     * restart saves it. Committed, not applied, so the same power cut cannot lose
     * this marker and hide the reminder.
     */
    private fun restartNeeded(ctx: Context, overlayMatters: Boolean, granted: Boolean): Boolean {
        val prefs = prefs(ctx)
        if (!overlayMatters || !granted) {
            prefs.edit(commit = true) { remove(KEY_GRANTED_BOOT) }
            return false
        }
        val boot = Settings.Global.getInt(ctx.contentResolver, Settings.Global.BOOT_COUNT, 0)
        val grantedBoot = prefs.getInt(KEY_GRANTED_BOOT, NOT_RECORDED)
        if (grantedBoot == NOT_RECORDED) {
            prefs.edit(commit = true) { putInt(KEY_GRANTED_BOOT, boot) }
            return true
        }
        return grantedBoot == boot
    }

    fun statusJson(ctx: Context): String {
        val (home, homeLabel) = homeChoice(ctx)
        val on = isOn(ctx)
        val needsOverlay = needsOverlay(home)
        val granted = Settings.canDrawOverlays(ctx)
        return JSONObject()
            .put("on", on)
            .put("defaultHome", home == HOME_SELF)
            .put("home", home)
            .put("homeLabel", homeLabel ?: JSONObject.NULL)
            .put("needsOverlay", needsOverlay)
            .put("canDrawOverlays", granted)
            .put("restartNeeded", restartNeeded(ctx, on && needsOverlay, granted))
            .toString()
    }
}
