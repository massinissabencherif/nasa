import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hestia.crew',
  appName: 'HESTIA Crew',
  webDir: 'dist',
  // HESTIA talks to the station over plain HTTP on the local base network (no internet, no TLS cert).
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
