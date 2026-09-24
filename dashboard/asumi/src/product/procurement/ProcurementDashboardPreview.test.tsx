import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ProcurementDashboardPreview } from './ProcurementDashboardPreview';

test('shows an interactive, clearly labeled purchase-dashboard preview and links to the real workspace', () => {
	const { container } = render(<ProcurementDashboardPreview entryHref="/hesab/modules/procurement" />);

	expect(screen.getByRole('heading', { name: 'داشبورد خرید، از نزدیک.' })).toBeInTheDocument();
	expect(screen.getByText(/عددها و پرونده‌ها نمونه‌اند/)).toBeInTheDocument();
	expect(screen.getByRole('link', { name: /ورود به داشبورد واقعی/ })).toHaveAttribute('href', '/hesab/modules/procurement');
	expect(container.querySelectorAll('.procurement-preview-kpi')).toHaveLength(4);

	fireEvent.click(screen.getByRole('button', { name: 'سفارش‌ها' }));
	expect(screen.getByRole('heading', { name: 'سفارش‌ها' })).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'سفارش‌های خرید معلق' })).toBeInTheDocument();

	fireEvent.click(screen.getByRole('button', { name: 'سه‌ماهه' }));
	expect(container.querySelector('.procurement-preview-kpi strong')).toHaveTextContent('۳۴');
});
