import { expect, test, vi } from 'vitest';
import { loadServiceAddonCatalog, loadServiceCheckoutStatus, loadServicePrices } from './pricingApi';

const prices = {
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

test('loads the public price maps from the Frappe API envelope', async () => {
	const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: prices }) } as Response));

	await expect(loadServicePrices(fetcher)).resolves.toEqual(prices);
	expect(fetcher).toHaveBeenCalledWith('/api/method/press.saas.commerce.api.service_pricing', { credentials: 'same-origin' });
});

test('rejects an unavailable price API', async () => {
	const fetcher = vi.fn(async () => ({ ok: false, json: async () => ({}) } as Response));

	await expect(loadServicePrices(fetcher)).rejects.toThrow(/قیمت/);
});

test('rejects unreadable JSON instead of showing any local price', async () => {
	const fetcher = vi.fn(async () => ({ ok: true, json: async () => { throw new SyntaxError('invalid JSON'); } } as unknown as Response));

	await expect(loadServicePrices(fetcher)).rejects.toThrow(/پاسخ تعرفه/);
});

test('rejects incomplete catalog maps instead of using bundled prices', async () => {
	const incomplete = { ...prices, modules: { ...prices.modules } };
	delete (incomplete.modules as Partial<typeof prices.modules>).finance;
	const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: incomplete }) } as Response));

	await expect(loadServicePrices(fetcher)).rejects.toThrow(/تعرفه/);
});

test('rejects negative, fractional, non-number, and over-limit prices', async () => {
	for (const invalid of [-1, 1.5, '5500000', 1_000_000_000_001]) {
		const invalidMap = { ...prices, modules: { ...prices.modules, finance: invalid } };
		const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: invalidMap }) } as Response));
		await expect(loadServicePrices(fetcher)).rejects.toThrow(/تعرفه/);
	}
});

test('reads the public service checkout status without exposing payment credentials', async () => {
	const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: { services_enabled: true } }) } as Response));

	await expect(loadServiceCheckoutStatus(fetcher)).resolves.toBe(true);
	expect(fetcher).toHaveBeenCalledWith('/api/method/press.saas.commerce.api.checkout_status', { credentials: 'same-origin' });
});

test('treats disabled and malformed checkout status safely', async () => {
	const disabled = vi.fn(async () => ({ ok: true, json: async () => ({ message: { services_enabled: false } }) } as Response));
	await expect(loadServiceCheckoutStatus(disabled)).resolves.toBe(false);
	const malformed = vi.fn(async () => ({ ok: true, json: async () => ({ message: { enabled: true } }) } as Response));
	await expect(loadServiceCheckoutStatus(malformed)).rejects.toThrow(/وضعیت فروش/);
});

test('loads only valid free and paid account add-ons from the public catalog', async () => {
	const catalog = [
		{ id: 'assistant_ai', title: 'دستیار هوش مصنوعی حسابیار', status: 'Paid', monthly_price_toman: 25_000 },
		{ id: 'internal_chat', title: 'چت سازمانی', status: 'Free', monthly_price_toman: 0 },
	];
	const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: catalog }) } as Response));

	await expect(loadServiceAddonCatalog(fetcher)).resolves.toEqual(catalog);
	expect(fetcher).toHaveBeenCalledWith('/api/method/press.saas.commerce.api.service_addon_catalog', { credentials: 'same-origin' });
});

test('hides unconfigured and disabled add-ons returned by a newer backend', async () => {
	const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: [
		{ id: 'assistant_ai', title: 'هوش مصنوعی', status: 'Disabled', monthly_price_toman: 0 },
		{ id: 'internal_chat', title: 'چت سازمانی', status: 'Unconfigured', monthly_price_toman: 0 },
	] }) } as Response));
	await expect(loadServiceAddonCatalog(fetcher)).resolves.toEqual([]);
});

test('rejects an unknown or invalid public add-on offer', async () => {
	for (const offer of [
		{ id: 'other', title: 'نامعتبر', status: 'Free', monthly_price_toman: 0 },
		{ id: 'assistant_ai', title: 'هوش مصنوعی', status: 'Paid', monthly_price_toman: 9_999 },
		{ id: 'internal_chat', title: 'چت', status: 'Free', monthly_price_toman: 1 },
	]) {
		const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ message: [offer] }) } as Response));
		await expect(loadServiceAddonCatalog(fetcher)).rejects.toThrow(/افزونه/);
	}
});
