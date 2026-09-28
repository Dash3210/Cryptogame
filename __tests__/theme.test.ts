import { getTheme, THEME_NAMES, getFontScale, getFontFamilyNative } from '../src/styles/theme';
import { Theme } from '../src/types';

describe('Hard Metrics: Theme Engine & Semantic Design Tokens', () => {

  test('All 5 themes define complete color schemes with zero undefined tokens', () => {
    const themeKeys: Theme[] = ['dark', 'cyberpunk', 'terminal', 'gold', 'light'];

    themeKeys.forEach((key) => {
      const themeColors = getTheme(key, 'dark');
      const lightThemeColors = getTheme(key, 'light');

      expect(themeColors).toBeDefined();
      expect(lightThemeColors).toBeDefined();

      const requiredTokens = [
        'background', 'surface', 'surfaceHighlight', 'text', 'textSecondary',
        'textMuted', 'border', 'primary', 'primaryBg', 'primaryBorder',
        'success', 'successBg', 'successBorder', 'error', 'errorBg',
        'matching', 'matchingBg', 'gold', 'goldBg', 'shadow'
      ];

      requiredTokens.forEach(token => {
        expect((themeColors as any)[token]).toBeDefined();
        expect((themeColors as any)[token]).toMatch(/^#|^rgba/);
      });
    });
  });

  test('THEME_NAMES metadata completeness', () => {
    const themeKeys: Theme[] = ['dark', 'cyberpunk', 'terminal', 'gold', 'light'];

    themeKeys.forEach(key => {
      expect(THEME_NAMES[key]).toBeDefined();
      expect(THEME_NAMES[key].name.length).toBeGreaterThan(0);
      expect(THEME_NAMES[key].icon.length).toBeGreaterThan(0);
      expect(THEME_NAMES[key].description.length).toBeGreaterThan(0);
    });
  });

  test('getFontScale maps correctly for small, medium, and large', () => {
    expect(getFontScale('small')).toBe(0.85);
    expect(getFontScale('medium')).toBe(1.0);
    expect(getFontScale('large')).toBe(1.18);
  });

  // Item 7: Distinct font family mappings for Android
  // Rule: each family has a real, distinct Android font value:
  // - 'sans' maps to 'sans-serif' (distinct from 'system' which defaults to undefined)
  // - 'cursive' maps to 'cursive' (distinct from 'serif')
  // - 'system' maps to undefined (platform default)
  // - 'mono' maps to 'monospace'
  // - 'serif' maps to 'serif'
  // - 'handwritten' maps to 'sans-serif-condensed'
  test('getFontFamilyNative maps distinct Android font stacks for all supported families', () => {
    expect(getFontFamilyNative('mono')).toBe('monospace');
    expect(getFontFamilyNative('serif')).toBe('serif');
    expect(getFontFamilyNative('cursive')).toBe('cursive');
    expect(getFontFamilyNative('handwritten')).toBe('sans-serif-condensed');
    expect(getFontFamilyNative('sans')).toBe('sans-serif');
    expect(getFontFamilyNative('system')).toBeUndefined();
    expect(getFontFamilyNative('unknown')).toBeUndefined();
  });
});
