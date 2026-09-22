import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeTabParamList = {
    Library: undefined;
    Saved: undefined;
    Store: undefined;
    Mastery: undefined;
    Settings: undefined;
};

export type RootStackParamList = {
    Home: NavigatorScreenParams<HomeTabParamList> | undefined;
    Game: {
        genreId?: string;
        mode?: 'standard' | 'daily' | 'blitz';
        dateStr?: string;
    } | undefined;
    DailyChallenge: undefined;
    Blitz: undefined;
    Leaderboard: undefined;
};
