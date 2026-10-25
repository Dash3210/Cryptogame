/* eslint-env jest */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Google Mobile Ads
jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    RewardedAd: {
      createForAdRequest: jest.fn(() => ({
        load: jest.fn(),
        show: jest.fn(),
        addAdEventListener: jest.fn(() => jest.fn()),
      })),
    },
    InterstitialAd: {
      createForAdRequest: jest.fn(() => ({
        load: jest.fn(),
        show: jest.fn(),
        addAdEventListener: jest.fn(() => jest.fn()),
      })),
    },
    BannerAd: ({ onAdLoaded, onAdFailedToLoad, testID, ...props }) => {
      React.useEffect(() => {
        onAdLoaded?.();
      }, [onAdLoaded]);
      return React.createElement(View, { testID: testID || 'admob-banner', ...props });
    },
    BannerAdSize: {
      BANNER: '320x50',
      ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
      FULL_BANNER: '468x60',
      LARGE_BANNER: '320x100',
    },
    RewardedAdEventType: {
      LOADED: 'LOADED',
      EARNED_REWARD: 'EARNED_REWARD',
    },
    AdEventType: {
      LOADED: 'LOADED',
      CLOSED: 'CLOSED',
      ERROR: 'ERROR',
    },
    TestIds: {
      REWARDED: 'ca-app-pub-3940256099942544/5224354917',
      BANNER: 'ca-app-pub-3940256099942544/6300978111',
      INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
    },
  };
});

// Mock react-native-svg: icons render as plain views in tests (no native module).
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (props) =>
    React.createElement(View, {
      style: props.style,
      accessibilityLabel: props.accessibilityLabel,
      testID: props.testID,
    });
  return {
    __esModule: true,
    default: passthrough,
    Svg: passthrough,
    SvgXml: passthrough,
    Path: passthrough,
    Circle: passthrough,
    Rect: passthrough,
    Line: passthrough,
    Polyline: passthrough,
    Polygon: passthrough,
    Ellipse: passthrough,
    G: passthrough,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const SafeAreaInsetsContext = React.createContext(inset);
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaInsetsContext,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    SafeAreaView: ({ children }) => children,
  };
});
