import { expect, test, vi } from 'vitest';
import { loadServicePrices } from './pricingApi';

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
