import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ModulePricingPage } from './ModulePricingPage';

const servicePrices = {
	modules: {
		finance: 5_500_000, sales: 5_500_000, crm: 2_500_000, procurement: 6_000_000,
		inventory: 6_000_000, projects: 3_200_000, manufacturing: 5_500_000, quality: 2_500_000,
		people: 3_600_000, assets: 3_200_000, fleet: 3_200_000, pricing: 3_000_000,
		growth: 3_500_000, business: 3_800_000, restaurant: 6_500_000,
	},
	addons: { restaurantMenu: 2_500_000 },
	packages: {
		restaurant: 6_500_000, restaurantPurchasing: 12_500_000, professional: 9_900_000,
		completeWithoutMenu: 47_500_000, complete: 50_000_000,
	},
};

beforeEach(() => window.localStorage.removeItem('asumi-pricing-selection-v2'));
afterEach(() => vi.unstubAllGlobals());

test('does not display old bundled prices while the server price map is loading', async () => {
	let resolveResponse!: (response: Response) => void;
	const responsePromise = new Promise<Response>(resolve => { resolveResponse = resolve; });
	vi.stubGlobal('fetch', vi.fn(() => responsePromise));
	render(<ModulePricingPage onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={vi.fn()} />);

	expect(screen.getByRole('status')).toHaveTextContent('در حال دریافت تعرفه');
	expect(screen.queryByText('۵٬۵۰۰٬۰۰۰ تومان')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'ادامه برای درخواست این ترکیب' })).not.toBeInTheDocument();

	resolveResponse({ ok: true, json: async () => ({ message: servicePrices }) } as Response);
	await screen.findAllByText('۵٬۵۰۰٬۰۰۰ تومان');
});

test('submits selected IDs only after loading prices and includes the menu addon', async () => {
	vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ message: servicePrices }) } as Response)));
	const onRequestPurchase = vi.fn();
	render(<ModulePricingPage onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={onRequestPurchase} />);
	await screen.findAllByText('۵٬۵۰۰٬۰۰۰ تومان');

	fireEvent.click(screen.getByRole('button', { name: 'پاک‌کردن انتخاب' }));
	fireEvent.click(screen.getByRole('button', { name: /افزودن ماژول فروش حضوری و رستوران/ }));
	fireEvent.click(screen.getByRole('button', { name: 'افزودن افزونه' }));
	fireEvent.click(screen.getByRole('button', { name: 'ادامه برای درخواست این ترکیب' }));

	expect(onRequestPurchase).toHaveBeenCalledWith(['restaurant'], '', ['restaurantMenu']);
});

test('shows an API error without a price fallback and allows retry', async () => {
	const fetcher = vi.fn()
		.mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
		.mockResolvedValueOnce({ ok: true, json: async () => ({ message: servicePrices }) } as Response);
	vi.stubGlobal('fetch', fetcher);
	render(<ModulePricingPage onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={vi.fn()} />);

	await screen.findByRole('alert');
	expect(screen.queryByText('۵٬۵۰۰٬۰۰۰ تومان')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'ادامه برای درخواست این ترکیب' })).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
	await waitFor(() => expect(screen.getByRole('button', { name: 'ادامه برای درخواست این ترکیب' })).toBeInTheDocument());
});
