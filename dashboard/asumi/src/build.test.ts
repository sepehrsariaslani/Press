import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import packageJson from '../../../package.json';
import asumiPackage from '../package.json';
import { stripFrappeCsrfPlaceholder } from '../scripts/frappe-shell.mjs';
import { expect, test } from 'vitest';

test('root build includes the Asumi application', () => {
	expect(packageJson.scripts['build-all']).toContain('build-asumi-app');
});

test('root utility CSS builds use the Tailwind binary installed with the dashboard', () => {
	const cssBuildScripts = [
		packageJson.scripts['build-email-css'],
		packageJson.scripts['build-marketplace-css'],
		packageJson.scripts['build-saas-css'],
	];
	cssBuildScripts.forEach((script) =>
		expect(script).toContain('yarn --cwd dashboard tailwindcss'),
	);
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

test('the static Asumi shell does not leave a Frappe CSRF injection marker', () => {
	const shell = '<body><!-- csrf_token --><div id="root"></div></body>';
	expect(stripFrappeCsrfPlaceholder(shell)).toBe('<body><div id="root"></div></body>');
});

test('the dashboard shell keeps the published Asumi mark available after clean builds', () => {
	const dashboardShell = readFileSync(resolve(process.cwd(), '../index.html'), 'utf8');
	const mark = readFileSync(resolve(process.cwd(), 'public/asumi-mark.svg'), 'utf8');

	expect(dashboardShell).toContain('<title>آسومی | پنل مدیریت</title>');
	expect(dashboardShell).toContain('/assets/press/asumi_site/asumi-mark.svg');
	expect(mark).toContain('aria-label="آسومی"');
});

test('every Press dashboard view is wrapped by the shared Asumi design system', () => {
	const app = readFileSync(resolve(process.cwd(), '../src/App.vue'), 'utf8');
	const styles = readFileSync(resolve(process.cwd(), '../src/assets/style.css'), 'utf8');
	const tokens = readFileSync(resolve(process.cwd(), '../src/assets/asumi-dashboard.css'), 'utf8');

	expect(app).toContain('class="asumi-dashboard');
	expect(app).toContain('<router-view');
	expect(styles).toContain("@import './asumi-dashboard.css';");
	expect(tokens).toContain('--case-black: #080808;');
	expect(tokens).toContain('--case-red: #c63140;');
	expect(tokens).toContain('--case-ink: #ede9e4;');
});
