import React, { useEffect, useState, useRef } from 'react';
import { TextStyle } from 'react-native';
import { AppText as Text } from './AppText';

interface CipherTransitionProps {
    text: string;
    durationMs?: number;
    cipherSpeedMs?: number;
    style?: TextStyle | TextStyle[];
    onComplete?: () => void;
}

const CIPHER_GLYPHS = '0123456789ABCDEF!@#$%^&*<>~§±ΞΨΩδλ';

/**
 * Thematic Cryptographic Transition Text Component
 * Deciphers raw text letter-by-letter with a mechanical/matrix glyph scramble
 */
export const CipherTransition: React.FC<CipherTransitionProps> = ({
    text,
    durationMs = 600,
    cipherSpeedMs = 35,
    style,
    onComplete,
}) => {
    const [displayText, setDisplayText] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!text) {
            setDisplayText('');
            return;
        }

        const totalChars = text.length;
        // Reveal progress is driven by elapsed time so the requested durationMs is
        // honoured for long text as well as short labels.
        const safeDuration = Math.max(cipherSpeedMs, durationMs);
        const startedAt = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const revealedCount = Math.min(totalChars, Math.floor((elapsed / safeDuration) * totalChars));

            if (revealedCount >= totalChars) {
                setDisplayText(text);
                if (intervalRef.current) clearInterval(intervalRef.current);
                onComplete?.();
                return;
            }

            let result = '';
            for (let i = 0; i < totalChars; i++) {
                const realChar = text[i];
                if (i < revealedCount) {
                    result += realChar;
                } else if (realChar === ' ' || realChar === '\n') {
                    result += realChar;
                } else {
                    const randIdx = Math.floor(Math.random() * CIPHER_GLYPHS.length);
                    result += CIPHER_GLYPHS[randIdx];
                }
            }
            setDisplayText(result);
        }, cipherSpeedMs);

        intervalRef.current = interval;

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [text, durationMs, cipherSpeedMs, onComplete]);

    return <Text style={style}>{displayText || text}</Text>;
};
