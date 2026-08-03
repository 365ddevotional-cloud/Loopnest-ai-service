package app.replit.attachment_parser__365ddevotional.twa;

import android.Manifest;
import android.app.AlertDialog;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Request code used for POST_NOTIFICATIONS permission. */
    static final int RC_POST_NOTIFICATIONS = 9001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the MusicControl plugin before the bridge initialises
        // so that the JS side can call it as soon as the WebView loads.
        registerPlugin(MusicControlPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 13+ requires an explicit runtime grant for POST_NOTIFICATIONS
        // before a MediaStyle notification is visible in the shade.
        // We ask on first launch so the user sees the prompt before music starts,
        // giving them a chance to allow it in context.
        requestNotificationPermissionIfNeeded();
    }

    // ── Notification permission (Android 13+) ────────────────────────────────

    /**
     * Checks whether POST_NOTIFICATIONS has been granted and, if not, either
     * shows a brief rationale dialog (then the system prompt) or goes straight
     * to the system prompt.  Safe to call on all API levels – the check is
     * guarded by a Build.VERSION comparison so it is a no-op on older devices.
     */
    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return; // Runtime permission not required below Android 13
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            return; // Already granted – nothing to do
        }

        if (ActivityCompat.shouldShowRequestPermissionRationale(
                this, Manifest.permission.POST_NOTIFICATIONS)) {
            // The user previously denied the permission; explain why it is
            // useful before asking again.
            new AlertDialog.Builder(this)
                    .setTitle("Enable music notifications")
                    .setMessage(
                            "Allow 365 Devotional to show a notification so you can control "
                            + "music playback and see song info from the lock screen or "
                            + "notification shade.")
                    .setPositiveButton("Allow", (dialog, which) ->
                            doRequestNotificationPermission())
                    .setNegativeButton("Not now", (dialog, which) ->
                            dialog.dismiss())
                    .setCancelable(true)
                    .show();
        } else {
            // First-time ask – go straight to the system dialog.
            doRequestNotificationPermission();
        }
    }

    /** Issues the actual system permission request. */
    private void doRequestNotificationPermission() {
        ActivityCompat.requestPermissions(
                this,
                new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                RC_POST_NOTIFICATIONS);
    }

    /**
     * Called by Android when the user responds to the permission dialog.
     * Playback is unaffected either way; if granted the notification service
     * will become visible on the next updateMetadata/setPlaybackState call.
     */
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults) {

        if (requestCode == RC_POST_NOTIFICATIONS) {
            // No action required: if granted, the MediaStyle notification will
            // appear automatically the next time the foreground service posts it.
            // If denied, audio continues to play without a visible notification.
            return;
        }

        // Let Capacitor handle any other permission results.
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }
}
