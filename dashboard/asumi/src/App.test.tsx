import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { AsumiApp } from './App';

test('starts directly on the active galaxy hero without a loading veil', () => {
	render(<AsumiApp />);
	expect(screen.queryByRole('status', { name: 'در حال آماده سازی تجربه آسومی' })).not.toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
	expect(screen.getByTestId('asumi-hero')).toHaveAttribute('data-active', 'true');
});

test('keeps this milestone focused on the hero only', () => {
	render(<AsumiApp />);
	expect(screen.queryByText('WHAT WE BUILD')).not.toBeInTheDocument();
});
