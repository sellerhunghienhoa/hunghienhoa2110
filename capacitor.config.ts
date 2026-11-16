import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.littlelegends.puzzlepvp',
  appName: 'Little Legends: Puzzle PVP',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: 'mobile',
    scheme: 'LittleLegends'
  }
};

export default config;
