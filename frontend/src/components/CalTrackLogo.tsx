import { Image, View } from 'react-native';

export function CalTrackLogo({ size = 42 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.23, overflow: 'hidden' }}>
      <Image
        source={require('../assets/images/caltrack-logo.webp')}
        accessibilityLabel="CalTrack logo"
        style={{
          position: 'absolute',
          width: size * 1280 / 944,
          height: size * 1280 / 944,
          left: -size * 156 / 944,
          top: -size * 152 / 944,
        }}
      />
    </View>
  );
}
