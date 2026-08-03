package app.replit.attachment_parser__365ddevotional.twa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the MusicControl plugin before the bridge initialises
        // so that the JS side can call it as soon as the WebView loads.
        registerPlugin(MusicControlPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
