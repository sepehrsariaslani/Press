import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { AsumiApp } from './App';

test('renders the Asumi brand heading', () => {
	render(<AsumiApp />);
	expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
});
