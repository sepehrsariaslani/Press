import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
	localStorage.clear();
	vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
});

test('exposes the next theme in its accessible label', () => {
	render(<ThemeToggle />);

	expect(
		screen.getByRole('button', { name: 'تغییر به حالت روشن' }),
	).toBeInTheDocument();
});
