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
	const { container } = render(<AsumiHero />);

	expect(screen.getByTestId('galaxy-background')).toBeInTheDocument();
	expect(screen.getByTestId('hybrid-horizon')).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
	expect(screen.getByText('明日美')).toBeInTheDocument();
	expect(screen.getByText('A Beautiful Tomorrow')).toBeInTheDocument();
	expect(screen.getByText('آینده‌ای', { exact: false })).toHaveTextContent('آینده‌ای روشن');
	expect(container.querySelectorAll('.asumi-particle')).toHaveLength(24);
});

test('renders the cinematic layers in the approved order', () => {
	render(<AsumiHero />);

	const layers = screen.getByTestId('asumi-hero').querySelectorAll(':scope > [data-layer]');
	expect(Array.from(layers, (layer) => layer.getAttribute('data-layer'))).toEqual([
		'galaxy', 'haze', 'sunrise', 'ribbons', 'particles', 'orbits', 'typography', 'cta',
	]);
	expect(screen.getByRole('link', { name: 'Explore Work' })).toBeInTheDocument();
	expect(screen.getAllByTestId('orbit')).toHaveLength(3);
});

test('does not bind pointer parallax when reduced motion is requested', () => {
	motion.useReducedMotion.mockReturnValue(true);
	render(<AsumiHero />);

	expect(screen.getByTestId('asumi-hero')).toHaveAttribute('data-parallax', 'off');
});
