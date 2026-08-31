import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { HorizonScene } from '../components/molecules/HorizonScene';
import { OrbitCircles } from '../components/molecules/OrbitCircles';

test('uses structural orbit circles without lens-flare ghosts', () => {
	const horizon = render(<HorizonScene />);
	const orbits = render(<OrbitCircles />);

	expect(horizon.container.querySelector('[data-lens-flare]')).not.toBeInTheDocument();
	expect(orbits.container.querySelectorAll('[data-orbit-path]')).toHaveLength(3);
});
