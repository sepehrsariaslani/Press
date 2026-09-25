import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { AsumiApp } from '../../App';
import { WebsiteDesignPricingPage } from './WebsiteDesignPricingPage';

afterEach(() => {
	window.localStorage.removeItem('asumi-website-design-estimate-v1');
	window.history.replaceState(null, '', '/');
});

test('opens the separate website-design price page without replacing ERP module pricing', async () => {
	window.history.replaceState(null, '', '/');
	render(<AsumiApp />);
	fireEvent.click(screen.getAllByRole('link', { name: 'طراحی سایت' })[0]);
	await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /یک سایت متناسب با/ })).toBeInTheDocument());
	expect(screen.getByRole('group', { name: 'انتخاب بسته‌ی طراحی سایت' })).toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 2, name: 'قابلیت‌های اضافه' })).toBeInTheDocument();
	expect(screen.getByRole('heading', { level: 2, name: 'خدمات ماهانه و رشد' })).toBeInTheDocument();
	expect(window.location.hash).toBe('#website-design');
});

test('shows package-specific scope and calculates the selected package with its addons', () => {
	window.history.replaceState(null, '', '#website-design');
	const { container } = render(<WebsiteDesignPricingPage onReturnToModules={() => undefined} />);
	expect(screen.getAllByText('تا ۵ صفحه').length).toBeGreaterThan(0);
	expect(screen.getAllByText('تا ۸ صفحه').length).toBeGreaterThan(0);
	expect(screen.getAllByText('تا ۱۲ صفحه').length).toBeGreaterThan(0);

	fireEvent.change(screen.getByRole('searchbox', { name: 'جست‌وجوی قابلیت' }), { target: { value: 'علاقه‌مندی' } });
	fireEvent.click(screen.getByRole('button', { name: 'افزودن به برآورد' }));
	expect(screen.getByRole('status')).toHaveTextContent('پیش‌نیاز فروشگاه پایه و صفحات محصول');
	expect(container.querySelector('.web-design-estimate')).toHaveTextContent('۳۴٬۰۰۰٬۰۰۰ تومان');
	expect(container.querySelector('.web-design-selected-list')).toHaveTextContent('فروشگاه پایه و صفحات محصول');
	expect(container.querySelector('.web-design-selected-list')).toHaveTextContent('علاقه‌مندی، مقایسه و نظر');
});

test('requires the advanced website package for ERP integration and separates monthly service costs', () => {
	window.history.replaceState(null, '', '#website-design');
	const { container } = render(<WebsiteDesignPricingPage onReturnToModules={() => undefined} />);
	fireEvent.click(screen.getByRole('button', { name: /بسته‌ی پیشرفته/ }));
	fireEvent.change(screen.getByRole('searchbox', { name: 'جست‌وجوی قابلیت' }), { target: { value: 'اتصال سایت به ERP' } });
	fireEvent.click(screen.getByRole('button', { name: 'افزودن به برآورد' }));
	expect(container.querySelector('.web-design-estimate')).toHaveTextContent('۸۵٬۰۰۰٬۰۰۰ تومان');
	fireEvent.click(container.querySelector('.web-design-monthly-card button.web-design-addon-toggle')!);
	expect(container.querySelector('.web-design-estimate')).toHaveTextContent('۱۰۰٬۰۰۰٬۰۰۰ تومان');
	const seoCard = container.querySelector('.web-design-monthly-card[data-selected="true"]');
	expect(seoCard).toHaveTextContent('SEO');
});

test('keeps Three.js pricing from the detailed add-ons sheet and blocks options with an unresolved prerequisite', () => {
	window.history.replaceState(null, '', '#website-design');
	const { container } = render(<WebsiteDesignPricingPage onReturnToModules={() => undefined} />);
	fireEvent.click(screen.getByRole('button', { name: /بسته‌ی متوسط/ }));
	fireEvent.change(screen.getByRole('searchbox', { name: 'جست‌وجوی قابلیت' }), { target: { value: 'Three.js' } });
	expect(container.querySelector('.web-design-addon-grid')).toHaveTextContent('۱۲٬۵۰۰٬۰۰۰ تومان');
	fireEvent.change(screen.getByRole('searchbox', { name: 'جست‌وجوی قابلیت' }), { target: { value: 'Ads Pixel' } });
	expect(screen.getByRole('button', { name: 'نیازمند بازبینی' })).toBeDisabled();
});
