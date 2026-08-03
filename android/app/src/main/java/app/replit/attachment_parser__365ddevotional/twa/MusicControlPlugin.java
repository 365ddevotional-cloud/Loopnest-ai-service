package app.replit.attachment_parser__365ddevotional.twa;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that bridges the web music player to the native
 * MediaPlaybackService foreground service.
 *
 * JS API (via registerPlugin('MusicControl')):
 *   MusicControl.updateMetadata({ title, artist, artworkUrl, isPlaying })
 *   MusicControl.setPlaybackState({ isPlaying })
 *   MusicControl.stop()
 *
 * JS events fired back to web:
 *   'play', 'pause', 'next', 'prev', 'stop'
 */
@CapacitorPlugin(name = "MusicControl")
public class MusicControlPlugin extends Plugin {

    /**
     * Static reference so MediaPlaybackService can reach back into
     * the plugin to fire JS events when notification buttons are tapped.
     * Set in load(), cleared in handleOnDestroy().
     */
    static MusicControlPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    // ── JS-callable methods ───────────────────────────────────────────────────

    /**
     * Start or update the foreground service with new song metadata.
     * Also updates the play/pause button state.
     *
     * @param title      Song title
     * @param artist     Artist name
     * @param artworkUrl URL to album art (may be null/empty)
     * @param isPlaying  Whether audio is currently playing
     */
    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String  title      = call.getString("title", "");
        String  artist     = call.getString("artist", "");
        String  artworkUrl = call.getString("artworkUrl", "");
        boolean isPlaying  = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));

        Intent intent = buildServiceIntent();
        intent.putExtra(MediaPlaybackService.EXTRA_TITLE,      title);
        intent.putExtra(MediaPlaybackService.EXTRA_ARTIST,     artist);
        intent.putExtra(MediaPlaybackService.EXTRA_ARTWORK,    artworkUrl);
        intent.putExtra(MediaPlaybackService.EXTRA_IS_PLAYING, isPlaying);
        startService(intent);

        call.resolve();
    }

    /**
     * Update only the play/pause button in the notification without
     * changing the song title, artist, or artwork.
     *
     * @param isPlaying Whether audio is currently playing
     */
    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));

        Intent intent = buildServiceIntent();
        intent.putExtra(MediaPlaybackService.EXTRA_IS_PLAYING, isPlaying);
        startService(intent);

        call.resolve();
    }

    /**
     * Stop the foreground service and dismiss the notification.
     * Called when the user closes the player from the web UI.
     */
    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MediaPlaybackService.class));
        call.resolve();
    }

    /**
     * Returns the current POST_NOTIFICATIONS permission status so the web
     * layer can decide whether to show the "open Settings" banner.
     *
     * Response: { granted: boolean, permanentlyDenied: boolean }
     *
     * permanentlyDenied is true when the permission is NOT granted AND
     * shouldShowRequestPermissionRationale() returns false — meaning the
     * user has already tapped Deny twice and the system will no longer
     * show the prompt.  (On API < 33 this is always false.)
     */
    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Notifications always allowed on older Android
            result.put("granted", true);
            result.put("permanentlyDenied", false);
            call.resolve(result);
            return;
        }

        boolean granted = ContextCompat.checkSelfPermission(getContext(),
                Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;

        boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                getActivity(), Manifest.permission.POST_NOTIFICATIONS);

        // Permanently denied = not granted AND the system will not show the prompt again
        boolean permanentlyDenied = !granted && !canShowRationale;

        result.put("granted", granted);
        result.put("permanentlyDenied", permanentlyDenied);
        call.resolve(result);
    }

    /**
     * Open the system notification settings screen for this app.
     * Called from JS when the user taps "Go to Settings" in the in-app banner.
     * On Android 8+ this targets the per-app notification channel page directly.
     */
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    // ── Callbacks from MediaPlaybackService (notification/session button taps) ─

    /** User tapped Play in the notification → tell JS to resume audio */
    void onNativePlay()  { notifyListeners("play",  new JSObject()); }

    /** User tapped Pause in the notification → tell JS to pause audio */
    void onNativePause() { notifyListeners("pause", new JSObject()); }

    /** User tapped Next in the notification → tell JS to skip forward */
    void onNativeNext()  { notifyListeners("next",  new JSObject()); }

    /** User tapped Previous in the notification → tell JS to skip back */
    void onNativePrev()  { notifyListeners("prev",  new JSObject()); }

    /** User swiped away / tapped Stop → tell JS to close the player */
    void onNativeStop()  {
        // Stop the service (notification already gone or being dismissed)
        getContext().stopService(new Intent(getContext(), MediaPlaybackService.class));
        notifyListeners("stop", new JSObject());
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private Intent buildServiceIntent() {
        return new Intent(getContext(), MediaPlaybackService.class);
    }

    private void startService(Intent intent) {
        // Android 13+ (API 33) requires POST_NOTIFICATIONS to be granted at
        // runtime before the MediaStyle notification is visible.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean granted = ContextCompat.checkSelfPermission(getContext(),
                    Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;

            if (!granted) {
                boolean canAsk = ActivityCompat.shouldShowRequestPermissionRationale(
                        getActivity(), Manifest.permission.POST_NOTIFICATIONS);

                if (canAsk) {
                    // Denied once (without "Don't ask again") — ask again.
                    ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                        MainActivity.RC_POST_NOTIFICATIONS
                    );
                } else {
                    // Permanently denied (or first launch before MainActivity asked).
                    // MainActivity always requests on launch, so by the time the user
                    // taps Play this reliably means "Don't ask again" was checked.
                    // Fire a JS event so the web layer can surface a Settings banner.
                    notifyListeners("notificationPermissionPermanentlyDenied", new JSObject());
                }
                // Either way, continue starting the service — audio plays fine,
                // only the notification is hidden until the user re-enables it.
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
    }
}
