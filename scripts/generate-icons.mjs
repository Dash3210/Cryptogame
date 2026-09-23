/**
 * Generates src/components/iconRegistry.ts from the SVG files in src/assets/icons.
 *
 * Run: node scripts/generate-icons.mjs
 * Add or replace an SVG in src/assets/icons, rerun, and the Icon component picks it up.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'src', 'assets', 'icons');
const outFile = join(root, 'src', 'components', 'iconRegistry.ts');

const files = readdirSync(iconsDir)
    .filter(name => name.toLowerCase().endsWith('.svg'))
    .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
    console.error('No SVG files found in', iconsDir);
    process.exit(1);
}

const entries = files.map(file => {
    const slug = file.replace(/\.svg$/i, '');
    const xml = readFileSync(join(iconsDir, file), 'utf8').trim();
    if (!xml.startsWith('<svg')) {
        throw new Error(`${file} does not start with <svg`);
    }
    return `  ${JSON.stringify(slug)}: ${JSON.stringify(xml)},`;
});

const output = `/* eslint-disable */
/**
 * AUTO-GENERATED FILE - do not edit by hand.
 * Source: src/assets/icons/*.svg
 * Regenerate: node scripts/generate-icons.mjs
 */
export const ICON_XML = {
${entries.join('\n')}
} as const;

export type IconName = keyof typeof ICON_XML;

export const ICON_NAMES = Object.keys(ICON_XML) as IconName[];
`;

writeFileSync(outFile, output, 'utf8');
console.log(`Generated ${files.length} icons -> ${outFile}`);
