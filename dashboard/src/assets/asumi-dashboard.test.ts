import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./asumi-dashboard.css', import.meta.url), 'utf8');
const stylesheet = postcss.parse(css);

describe('Asumi dashboard portal styles', () => {
	it('gives portalled components the Asumi font stack', () => {
		let fontStack = '';

		stylesheet.walkRules((rule) => {
			if (!rule.selectors?.includes("html[data-theme='dark'] body")) return;
			fontStack = rule.nodes.find((node) => node.prop === 'font-family')?.value || '';
		});

		expect(fontStack).toContain('Manrope Variable');
		expect(fontStack).toContain('Vazirmatn Variable');
	});

	it('loads Asumi fonts from the dashboard public asset directory', () => {
		expect(css).toContain("url('../fonts/asumi/vazirmatn-arabic.woff2')");
		expect(css).toContain("url('../fonts/asumi/manrope-latin.woff2')");
	});

	it('applies the compact radius to portalled rounded controls', () => {
		let hasGlobalRoundedControlStyle = false;

		stylesheet.walkRules((rule) => {
			if (
				!rule.selectors?.some(
					(selector) =>
						selector.includes("html[data-theme='dark'] :is(") &&
						selector.includes("[class~='rounded-xl']"),
				)
			)
				return;
			hasGlobalRoundedControlStyle = rule.nodes.some(
				(node) => node.prop === 'border-radius' && node.value === 'var(--case-radius)',
			);
		});

		expect(hasGlobalRoundedControlStyle).toBe(true);
	});

	it('applies Asumi corner geometry to portalled dialogs', () => {
		let hasAsumiDialogRadius = false;

		stylesheet.walkRules((rule) => {
			const selectors = rule.selectors || [];
			if (!selectors.includes("html[data-theme='dark'] .dialog-content")) return;

			hasAsumiDialogRadius = rule.nodes.some(
				(node) => node.prop === 'border-radius' && node.value === 'var(--case-radius)',
			);
		});

		expect(hasAsumiDialogRadius).toBe(true);
	});

	it('keeps portalled dialogs inside the mobile viewport', () => {
		let hasMobileDialogConstraint = false;

		stylesheet.walkAtRules('media', (media) => {
			if (!media.params.includes('max-width: 767px')) return;

			media.walkRules((rule) => {
				const selectors = rule.selectors || [];
				if (!selectors.includes("html[data-theme='dark'] [role='dialog']")) return;

				hasMobileDialogConstraint = rule.nodes.some(
					(node) =>
						node.prop === 'max-width' &&
						node.value === 'calc(100vw - 1.25rem)',
				);
			});
		});

		expect(hasMobileDialogConstraint).toBe(true);
	});
});
