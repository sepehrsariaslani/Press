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

	expect(screen.getByText('در حال دریافت تعرفهٔ به‌روز آسومی…')).toBeInTheDocument();
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

	expect(onRequestPurchase).toHaveBeenCalledWith(['restaurant'], '', ['restaurantMenu'], 'request');
});

test('offers a paid one-month order only when the server enables service checkout', async () => {
	vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
		if (String(input).includes('checkout_status')) {
			return { ok: true, json: async () => ({ message: { services_enabled: true } }) } as Response;
		}
		return { ok: true, json: async () => ({ message: servicePrices }) } as Response;
	}));
	const onRequestPurchase = vi.fn();
	render(<ModulePricingPage onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={onRequestPurchase} />);

	const purchaseButton = await screen.findByRole('button', { name: 'ثبت سفارش و پرداخت' });
	expect(screen.getByText(/پرداخت یک‌ماهه با زرین‌پال انجام می‌شود/)).toBeInTheDocument();
	fireEvent.click(purchaseButton);
	expect(onRequestPurchase).toHaveBeenCalledWith(['finance'], '', [], 'purchase');
});

test('keeps the estimate request when the server has not enabled checkout', async () => {
	vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
		if (String(input).includes('checkout_status')) {
			return { ok: true, json: async () => ({ message: { services_enabled: false } }) } as Response;
		}
		return { ok: true, json: async () => ({ message: servicePrices }) } as Response;
	}));
	const onRequestPurchase = vi.fn();
	render(<ModulePricingPage onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={onRequestPurchase} />);

	fireEvent.click(await screen.findByRole('button', { name: 'ادامه برای درخواست این ترکیب' }));
	expect(onRequestPurchase).toHaveBeenCalledWith(['finance'], '', [], 'request');
});

test('shows an API error without a price fallback and allows retry', async () => {
	let priceAttempts = 0;
	const fetcher = vi.fn((input: RequestInfo | URL) => {
		if (String(input).includes('checkout_status')) {
			return Promise.resolve({ ok: true, json: async () => ({ message: { services_enabled: false } }) } as Response);
		}
		priceAttempts += 1;
		return Promise.resolve(priceAttempts === 1
			? { ok: false, json: async () => ({}) } as Response
			: { ok: true, json: async () => ({ message: servicePrices }) } as Response);
	});
	vi.stubGlobal('fetch', fetcher);
	render(<ModulePricingPage onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={vi.fn()} />);

	await screen.findByRole('alert');
	expect(screen.queryByText('۵٬۵۰۰٬۰۰۰ تومان')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'ادامه برای درخواست این ترکیب' })).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
	await waitFor(() => expect(screen.getByRole('button', { name: 'ادامه برای درخواست این ترکیب' })).toBeInTheDocument());
});

test('shows paid and free Accounts add-ons independently from the module selection', async () => {
	vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
		if (String(input).includes('service_addon_catalog')) {
			return { ok: true, json: async () => ({ message: [
				{ id: 'assistant_ai', title: 'دستیار هوش مصنوعی حسابیار', status: 'Paid', monthly_price_toman: 25_000 },
				{ id: 'internal_chat', title: 'چت سازمانی', status: 'Free', monthly_price_toman: 0 },
			] }) } as Response;
		}
		if (String(input).includes('checkout_status')) return { ok: true, json: async () => ({ message: { services_enabled: true } }) } as Response;
		return { ok: true, json: async () => ({ message: servicePrices }) } as Response;
	}));
	const onPurchaseAddon = vi.fn();
	render(<ModulePricingPage isAuthenticated onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={vi.fn()} onPurchaseAddon={onPurchaseAddon} />);

	const assistant = await screen.findByText('دستیار هوش مصنوعی حسابیار');
	expect(assistant).toBeInTheDocument();
	expect(screen.getByText('چت سازمانی')).toBeInTheDocument();
	expect(screen.getByText('۲۵٬۰۰۰ تومان در ماه')).toBeInTheDocument();
	expect(screen.getByText('رایگان')).toBeInTheDocument();
	expect(screen.getByText(/پرداخت یک‌ماهه با زرین‌پال انجام می‌شود/)).toBeInTheDocument();
	expect(screen.queryByText(/ثبت درخواست بررسی، فاکتور یا پرداخت نیست/)).not.toBeInTheDocument();
	fireEvent.click(screen.getByRole('button', { name: 'خرید دستیار هوش مصنوعی حسابیار برای یک ماه' }));
	expect(onPurchaseAddon).toHaveBeenCalledWith('assistant_ai');
	expect(screen.queryByRole('button', { name: /خرید چت سازمانی/ })).not.toBeInTheDocument();
});

test('offers guest purchase through the login redirect and hides paid checkout when sales are disabled', async () => {
	const fetcher = vi.fn(async (input: RequestInfo | URL) => {
		if (String(input).includes('service_addon_catalog')) return { ok: true, json: async () => ({ message: [{ id: 'assistant_ai', title: 'دستیار هوش مصنوعی حسابیار', status: 'Paid', monthly_price_toman: 25_000 }] }) } as Response;
		if (String(input).includes('checkout_status')) return { ok: true, json: async () => ({ message: { services_enabled: true } }) } as Response;
		return { ok: true, json: async () => ({ message: servicePrices }) } as Response;
	});
	vi.stubGlobal('fetch', fetcher);
	const onPurchaseAddon = vi.fn();
	render(<ModulePricingPage isAuthenticated={false} onOpenModule={vi.fn()} onReturnToModules={vi.fn()} onRequestPurchase={vi.fn()} onPurchaseAddon={onPurchaseAddon} />);

	await screen.findByText('دستیار هوش مصنوعی حسابیار');
	fireEvent.click(screen.getByRole('button', { name: 'ورود و خرید دستیار هوش مصنوعی حسابیار' }));
	expect(onPurchaseAddon).toHaveBeenCalledWith('assistant_ai');
});
