import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useTheme } from './useTheme';

beforeEach(() => {
	localStorage.clear();
	document.documentElement.removeAttribute('data-theme');
	vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('uses a saved theme preference', () => {
	localStorage.setItem('asumi-theme', 'light');
	const { result } = renderHook(() => useTheme());

	expect(result.current.theme).toBe('light');
	expect(document.documentElement.dataset.theme).toBe('light');
});

test('persists a theme selected by the visitor', () => {
	const { result } = renderHook(() => useTheme());

	act(() => result.current.setTheme('light'));

	expect(localStorage.getItem('asumi-theme')).toBe('light');
});
