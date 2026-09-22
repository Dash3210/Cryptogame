import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

const PERSISTED_KEYS = [
    'brainCipherPoints',
    'brainCipherCoins',
    'brainCipherFavorites',
    'brainCipherExtensions',
    'brainCipherThemes',
    'brainCipherSettings',
    'brainCipherProgress',
    'brainCipherSavedGames',
    'brainCipherStats',
    'brainCipherAchievements',
];

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Always surface the crash somewhere. Wire a crash reporter here
        // (Sentry/Crashlytics) when one is added to the project.
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    handleClearData = async () => {
        try {
            await AsyncStorage.multiRemove(PERSISTED_KEYS);
        } catch {
            // Storage unavailable; still attempt a re-render.
        }
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.icon}>!</Text>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        The app encountered an unexpected error. Please try again.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <Text style={styles.errorDetail}>
                            {this.state.error.message}
                        </Text>
                    )}
                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={this.handleReset}
                    >
                        <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={this.handleClearData}
                    >
                        <Text style={styles.secondaryButtonText}>Clear saved data & restart</Text>
                    </Pressable>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#1c1917'
    },
    icon: {
        fontSize: 36,
        fontWeight: '900',
        color: '#f59e0b',
        marginBottom: 16
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fafaf9',
        marginBottom: 8
    },
    message: {
        fontSize: 14,
        color: '#a8a29e',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24
    },
    errorDetail: {
        fontSize: 11,
        color: '#ef4444',
        fontFamily: 'monospace',
        textAlign: 'center',
        marginBottom: 24,
        padding: 12,
        backgroundColor: '#292524',
        borderRadius: 8,
        overflow: 'hidden'
    },
    button: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700'
    },
    secondaryButton: {
        marginTop: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#44403c'
    },
    secondaryButtonText: {
        color: '#d6d3d1',
        fontSize: 14,
        fontWeight: '600'
    }
});
