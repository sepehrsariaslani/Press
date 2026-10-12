import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import packageJson from '../../../package.json';
import asumiPackage from '../package.json';
import { expect, test } from 'vitest';

test('root build includes the Asumi application', () => {
	expect(packageJson.scripts['build-all']).toContain('build-asumi-app');
});

test('build emits cache-busted assets and synchronizes the Frappe shell', () => {
	const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

	expect(viteConfig).toContain('[hash]');
	expect(viteConfig).not.toContain("entryFileNames: 'assets/main.js'");
	expect(asumiPackage.scripts.build).toContain('sync-frappe-shell.mjs');
});

test('the Asumi HTML shell bypasses Frappe page caching', () => {
	const pageController = readFileSync(resolve(process.cwd(), '../../press/www/asumi.py'), 'utf8');
	expect(pageController).toContain('no_cache = 1');
});
