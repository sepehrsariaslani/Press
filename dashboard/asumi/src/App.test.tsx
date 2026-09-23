import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AsumiApp } from './App';

afterEach(() => vi.useRealTimers());

test('uses the galaxy-backed first-light loader before activating the hero', () => {
	vi.useFakeTimers();
	render(<AsumiApp />);
	expect(screen.getByRole('status', { name: 'در حال آماده سازی تجربه آسومی' })).toBeInTheDocument();
	expect(screen.getByTestId('loader-strands')).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
	expect(screen.getByTestId('asumi-hero')).toHaveAttribute('data-active', 'false');

	act(() => vi.advanceTimersByTime(1400));
	expect(screen.queryByRole('status', { name: 'در حال آماده سازی تجربه آسومی' })).not.toBeInTheDocument();
	expect(screen.getByTestId('asumi-hero')).toHaveAttribute('data-active', 'true');
});

test('keeps this milestone focused on the hero only', () => {
	render(<AsumiApp />);
	expect(screen.queryByText('WHAT WE BUILD')).not.toBeInTheDocument();
});
