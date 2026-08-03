package app.replit.attachment_parser__365ddevotional.twa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import android.os.Handler;
import android.os.Looper;

import java.io.InputStream;
import java.net.URL;

/**
 * Foreground service that keeps audio alive when the app is backgrounded.
 * Shows a MediaStyle notification with artwork and transport controls.
 */
public class MediaPlaybackService extends Service {

    static final String CHANNEL_ID      = "spirittone_playback";
    static final int    NOTIFICATION_ID = 1001;

    // Broadcast action constants
    static final String ACTION_PLAY   = "app.365devo.action.PLAY";
    static final String ACTION_PAUSE  = "app.365devo.action.PAUSE";
    static final String ACTION_NEXT   = "app.365devo.action.NEXT";
    static final String ACTION_PREV   = "app.365devo.action.PREV";
    static final String ACTION_STOP   = "app.365devo.action.STOP";

    // Intent extras sent from MusicControlPlugin
    static final String EXTRA_TITLE      = "title";
    static final String EXTRA_ARTIST     = "artist";
    static final String EXTRA_ARTWORK    = "artworkUrl";
    static final String EXTRA_IS_PLAYING = "isPlaying";

    private MediaSessionCompat mediaSession;
    private AudioManager       audioManager;
    private AudioFocusRequest  audioFocusRequest; // API 26+
    private AudioManager.OnAudioFocusChangeListener audioFocusListener;

    private String  currentTitle      = "";
    private String  currentArtist     = "";
    private String  currentArtworkUrl = null;
    private boolean currentIsPlaying  = false;
    private Bitmap  currentArtworkBitmap = null;
    private Bitmap  fallbackBitmap       = null; // lazy-loaded app icon

    // ── Notification button broadcast receiver ─────────────────────────────────

    private final BroadcastReceiver controlReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (action == null) return;

            // Mirror state in notification immediately (no JS round-trip needed)
            switch (action) {
                case ACTION_PLAY:
                    currentIsPlaying = true;
                    updateNotificationInPlace();
                    break;
                case ACTION_PAUSE:
                    currentIsPlaying = false;
                    updateNotificationInPlace();
                    break;
                case ACTION_STOP:
                    stopForegroundService();
                    break;
            }

            // Relay to JS via plugin
            MusicControlPlugin plugin = MusicControlPlugin.instance;
            if (plugin != null) {
                switch (action) {
                    case ACTION_PLAY:  plugin.onNativePlay();  break;
                    case ACTION_PAUSE: plugin.onNativePause(); break;
                    case ACTION_NEXT:  plugin.onNativeNext();  break;
                    case ACTION_PREV:  plugin.onNativePrev();  break;
                    case ACTION_STOP:  plugin.onNativeStop();  break;
                }
            }
        }
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        setupAudioFocusListener();
        setupMediaSession();
        registerControlReceiver();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        // Update state from intent extras (only non-null values override)
        String title = intent.getStringExtra(EXTRA_TITLE);
        if (title != null) currentTitle = title;

        String artist = intent.getStringExtra(EXTRA_ARTIST);
        if (artist != null) currentArtist = artist;

        // isPlaying is always supplied
        currentIsPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, currentIsPlaying);

        // Check if artwork URL changed
        String newArtworkUrl = intent.getStringExtra(EXTRA_ARTWORK);
        boolean artworkChanged = newArtworkUrl != null && !newArtworkUrl.equals(currentArtworkUrl);
        if (newArtworkUrl != null) currentArtworkUrl = newArtworkUrl;

        requestAudioFocus();

        // Start foreground immediately with current bitmap (may be null or stale)
        startForeground(NOTIFICATION_ID, buildNotification());

        // Refresh artwork in background if it changed
        if (artworkChanged && currentArtworkUrl != null && !currentArtworkUrl.isEmpty()) {
            final String url = currentArtworkUrl;
            new Thread(() -> fetchArtwork(url, /* isRetry= */ false)).start();
        } else if (artworkChanged) {
            currentArtworkBitmap = null;
        }

        updateMediaSessionState();
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        try { unregisterReceiver(controlReceiver); } catch (Exception ignored) {}
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    // ── Setup helpers ─────────────────────────────────────────────────────────

    private void setupMediaSession() {
        mediaSession = new MediaSessionCompat(this, "SpiritToneSession");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay()             { sendControlBroadcast(ACTION_PLAY);  }
            @Override public void onPause()            { sendControlBroadcast(ACTION_PAUSE); }
            @Override public void onSkipToNext()       { sendControlBroadcast(ACTION_NEXT);  }
            @Override public void onSkipToPrevious()   { sendControlBroadcast(ACTION_PREV);  }
            @Override public void onStop()             { sendControlBroadcast(ACTION_STOP);  }
        });
        mediaSession.setActive(true);
    }

    private void sendControlBroadcast(String action) {
        Intent intent = new Intent(action);
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
    }

    private void setupAudioFocusListener() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        audioFocusListener = focusChange -> {
            MusicControlPlugin plugin = MusicControlPlugin.instance;
            switch (focusChange) {
                case AudioManager.AUDIOFOCUS_LOSS:
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    // Pause — tell JS
                    currentIsPlaying = false;
                    updateNotificationInPlace();
                    if (plugin != null) plugin.onNativePause();
                    break;
                case AudioManager.AUDIOFOCUS_GAIN:
                    // Resume — tell JS
                    currentIsPlaying = true;
                    updateNotificationInPlace();
                    if (plugin != null) plugin.onNativePlay();
                    break;
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    // Lower volume slightly; we don't need to pause
                    break;
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build())
                .setOnAudioFocusChangeListener(audioFocusListener)
                .setWillPauseWhenDucked(false)
                .build();
        }
    }

    private void requestAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            //noinspection deprecation
            audioManager.requestAudioFocus(audioFocusListener,
                AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            //noinspection deprecation
            audioManager.abandonAudioFocus(audioFocusListener);
        }
    }

    private void registerControlReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PLAY);
        filter.addAction(ACTION_PAUSE);
        filter.addAction(ACTION_NEXT);
        filter.addAction(ACTION_PREV);
        filter.addAction(ACTION_STOP);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(controlReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(controlReceiver, filter);
        }
    }

    // ── Notification helpers ──────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows the currently playing song and transport controls");
            channel.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        // Tapping the notification opens the app
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle.isEmpty() ? "365 Daily Devotional" : currentTitle)
            .setContentText(currentArtist)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentIntent(openPi)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setDeleteIntent(makePendingBroadcast(ACTION_STOP, 99));

        builder.setLargeIcon(getEffectiveArtwork());

        // Action 0: Previous
        builder.addAction(new NotificationCompat.Action(
            android.R.drawable.ic_media_previous, "Previous",
            makePendingBroadcast(ACTION_PREV, 0)));

        // Action 1: Play / Pause
        if (currentIsPlaying) {
            builder.addAction(new NotificationCompat.Action(
                android.R.drawable.ic_media_pause, "Pause",
                makePendingBroadcast(ACTION_PAUSE, 1)));
        } else {
            builder.addAction(new NotificationCompat.Action(
                android.R.drawable.ic_media_play, "Play",
                makePendingBroadcast(ACTION_PLAY, 1)));
        }

        // Action 2: Next
        builder.addAction(new NotificationCompat.Action(
            android.R.drawable.ic_media_next, "Next",
            makePendingBroadcast(ACTION_NEXT, 2)));

        // Action 3: Stop / Dismiss
        builder.addAction(new NotificationCompat.Action(
            android.R.drawable.ic_delete, "Stop",
            makePendingBroadcast(ACTION_STOP, 3)));

        // MediaStyle — show prev(0), play/pause(1), next(2) in compact view
        MediaStyle style = new MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1, 2);
        builder.setStyle(style);

        return builder.build();
    }

    private PendingIntent makePendingBroadcast(String action, int requestCode) {
        Intent intent = new Intent(action);
        intent.setPackage(getPackageName());
        return PendingIntent.getBroadcast(this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void updateNotificationInPlace() {
        updateMediaSessionState();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) return;

        // Metadata
        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "365 Daily Devotional");
        metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, getEffectiveArtwork());
        mediaSession.setMetadata(metaBuilder.build());

        // Playback state
        long actions =
            PlaybackStateCompat.ACTION_PLAY_PAUSE |
            PlaybackStateCompat.ACTION_PLAY        |
            PlaybackStateCompat.ACTION_PAUSE       |
            PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
            PlaybackStateCompat.ACTION_STOP;
        int state = currentIsPlaying
            ? PlaybackStateCompat.STATE_PLAYING
            : PlaybackStateCompat.STATE_PAUSED;
        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
            .build());
    }

    /**
     * Downloads artwork for {@code url} on the calling thread.
     * On failure, schedules one retry after 3 seconds if this is not already a
     * retry; otherwise leaves the fallback icon in place with no further attempts.
     */
    private void fetchArtwork(String url, boolean isRetry) {
        try {
            InputStream stream = new URL(url).openStream();
            Bitmap bmp = BitmapFactory.decodeStream(stream);
            stream.close();
            if (url.equals(currentArtworkUrl)) {
                currentArtworkBitmap = bmp;
                updateNotificationInPlace();
            }
        } catch (Exception ignored) {
            if (!isRetry) {
                new Handler(Looper.getMainLooper()).postDelayed(() ->
                    new Thread(() -> fetchArtwork(url, /* isRetry= */ true)).start(),
                    3000);
            }
            // If retry also fails, fallback icon remains — no further attempts.
        }
    }

    /**
     * Returns the current song artwork bitmap, or the app launcher icon as a
     * fallback so Bluetooth / car-display integrations never see a blank image.
     */
    private Bitmap getEffectiveArtwork() {
        if (currentArtworkBitmap != null) return currentArtworkBitmap;
        if (fallbackBitmap == null) {
            fallbackBitmap = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        }
        return fallbackBitmap;
    }

    // ── Called by MusicControlPlugin.stop() ──────────────────────────────────

    void stopForegroundService() {
        abandonAudioFocus();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            //noinspection deprecation
            stopForeground(true);
        }
        stopSelf();
    }
}
