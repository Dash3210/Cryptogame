import React, { useState } from 'react';
import { StatusBar, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider, useGame } from './src/context/GameContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getFontScale } from './src/styles/theme';
import { HomeTabParamList, RootStackParamList } from './src/navigation/types';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { StoreScreen } from './src/screens/StoreScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { MasteryScreen } from './src/screens/MasteryScreen';
import { GameScreen } from './src/screens/GameScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DailyChallengeScreen } from './src/screens/DailyChallengeScreen';
import { BlitzScreen } from './src/screens/BlitzScreen';

const Tab = createBottomTabNavigator<HomeTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Tab Navigator (Home Screen)
function HomeTabs() {
  const { settings, colors } = useGame();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          // Let the navigator add the bottom safe-area inset (edge-to-edge on
          // targetSdk 36 would otherwise push the labels under the gesture bar).
          paddingTop: 6,
          elevation: 0,
        },
        tabBarItemStyle: {
          minHeight: 48,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10 * getFontScale(settings.fontSize),
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⊞</Text>
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>★</Text>
        }}
      />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⧉</Text>
        }}
      />
      <Tab.Screen
        name="Mastery"
        component={MasteryScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>▲</Text>
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙</Text>
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { settings, colors } = useGame();
  const isLight = settings.theme === 'light';

  return (
    <>
      <StatusBar
        barStyle={isLight ? 'dark-content' : 'light-content'}
        backgroundColor={colors.surface}
      />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeTabs} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} />
          <Stack.Screen name="Blitz" component={BlitzScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

function MainApp() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onStart={() => setShowSplash(false)} />;
  }

  return <RootNavigator />;
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GameProvider>
          <MainApp />
        </GameProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
