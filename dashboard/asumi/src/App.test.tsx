import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { AsumiApp } from './App';

test('starts with the Asumi loading veil over the brand frame', () => {
	render(<AsumiApp />);
	expect(screen.getByRole('status', { name: 'در حال آماده سازی تجربه آسومی' })).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
});

test('keeps this milestone focused on the hero only', () => {
	render(<AsumiApp />);
	expect(screen.queryByText('WHAT WE BUILD')).not.toBeInTheDocument();
});
