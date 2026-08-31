import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const motion = vi.hoisted(() => ({
	useReducedMotion: vi.fn(),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
	useReducedMotion: motion.useReducedMotion,
}));

import { AsumiHero } from './AsumiHero';

beforeEach(() => {
	motion.useReducedMotion.mockReturnValue(false);
	vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
});

test('renders every line of the approved brand lockup', () => {
	render(<AsumiHero />);

	expect(screen.getByTestId('hybrid-horizon')).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
	expect(screen.getByText('明日美')).toBeInTheDocument();
	expect(screen.getByText('A Beautiful Tomorrow')).toBeInTheDocument();
	expect(screen.getByText('آینده‌ای روشن')).toBeInTheDocument();
});

test('keeps the brand frame free of a pill CTA', () => {
	render(<AsumiHero />);

	expect(screen.queryByRole('link', { name: 'Explore Work' })).not.toBeInTheDocument();
});

test('does not bind pointer parallax when reduced motion is requested', () => {
	motion.useReducedMotion.mockReturnValue(true);
	render(<AsumiHero />);

	expect(screen.getByTestId('asumi-hero')).toHaveAttribute('data-parallax', 'off');
});
