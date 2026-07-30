import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.replit.attachment_parser__365ddevotional.twa',
  appName: '365 Daily Devotional',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'https://365dailydevotional.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
