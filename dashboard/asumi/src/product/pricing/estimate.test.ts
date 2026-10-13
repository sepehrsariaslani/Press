import { expect, test } from 'vitest';
import { estimateSelection } from './estimate';

const prices = {
	modules: {
		finance: 10, sales: 20, crm: 30, procurement: 40, inventory: 50,
		projects: 60, manufacturing: 70, quality: 80, people: 90, assets: 100,
		fleet: 110, pricing: 120, growth: 130, business: 140, restaurant: 150,
	},
	addons: { restaurantMenu: 15 },
	packages: { restaurant: 135, restaurantPurchasing: 200, professional: 555, completeWithoutMenu: 777, complete: 888 },
};

test('uses current server module and addon amounts for a custom selection', () => {
	expect(estimateSelection(['finance', 'sales'], [], prices)).toMatchObject({
		moduleTotal: 30,
		addonTotal: 0,
		listedTotal: 30,
		bundleDiscount: 0,
		total: 30,
	});
	expect(estimateSelection(['restaurant'], ['restaurantMenu'], prices).total).toBe(165);
});

test('uses the package price for each exact suggested combination', () => {
	expect(estimateSelection(['restaurant'], [], prices)).toMatchObject({
		packageId: 'restaurant',
		bundleDiscount: 15,
		total: 135,
	});
	expect(estimateSelection(['restaurant', 'procurement'], [], prices).total).toBe(200);

	const professional = ['finance', 'sales', 'procurement', 'inventory', 'crm', 'projects', 'manufacturing', 'quality', 'people', 'assets', 'pricing'] as const;
	expect(estimateSelection(professional, [], prices)).toMatchObject({ packageId: 'professional', total: 555 });
});

test('does not show a negative discount when an administrator sets a higher package price', () => {
	const higherRestaurantPackage = { ...prices, packages: { ...prices.packages, restaurant: 200 } };
	expect(estimateSelection(['restaurant'], [], higherRestaurantPackage)).toMatchObject({
		listedTotal: 150,
		bundleDiscount: 0,
		total: 200,
	});
});
