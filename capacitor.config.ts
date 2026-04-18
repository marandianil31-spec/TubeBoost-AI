import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tubeboost.app',
  appName: 'TubeBoost AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
