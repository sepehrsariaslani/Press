import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { getAccountsPreviewHref, ProcurementDashboardPreview } from './ProcurementDashboardPreview';

test('embeds the real Accounts procurement dashboard and offers a full-page route', () => {
	render(<ProcurementDashboardPreview entryHref="/hesab/modules/procurement" />);

	const expectedHref = '/hesab/modules/procurement';
	const previewFrame = screen.getByTitle('پیش‌نمایش زنده‌ی داشبورد خرید در برنامه‌ی Accounts');

	expect(screen.getByRole('heading', { name: 'داشبورد خرید در Accounts' })).toBeInTheDocument();
	expect(previewFrame).toHaveAttribute('src', expectedHref);
	expect(previewFrame).toHaveAttribute('loading', 'eager');
	expect(screen.getByRole('link', { name: /بازکردن در صفحه‌ی کامل/ })).toHaveAttribute('href', expectedHref);
	expect(screen.getByText(/داده‌های شرکت، باید در Accounts وارد شده باشید/)).toBeInTheDocument();
	expect(document.querySelector('.procurement-preview-kpi')).not.toBeInTheDocument();
});

test('routes the local site preview to the real Accounts bench while production stays same-origin', () => {
	expect(getAccountsPreviewHref('/hesab/modules/procurement', '/assets/press/asumi_site/index.html'))
		.toBe('http://asumi:8000/hesab/modules/procurement');
	expect(getAccountsPreviewHref('/hesab/modules/procurement', '/asumi'))
		.toBe('/hesab/modules/procurement');
});
