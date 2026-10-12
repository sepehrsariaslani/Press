import { createListResource } from 'frappe-ui';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('frappe-ui', () => ({
	createListResource: vi.fn(),
}));

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(globalThis, {
		LucidePanelTopInactive: {},
		LucideServer: {},
		LucideBoxes: {},
	});
});

test('does not request private search records for a guest', async () => {
	const { addIntegrations } = await import('./integrations');
	addIntegrations(false);

	expect(createListResource).not.toHaveBeenCalled();
});

test('loads site, bench, and server search records for a logged-in user', async () => {
	const { addIntegrations } = await import('./integrations');
	addIntegrations(true);

	expect(createListResource).toHaveBeenCalledTimes(3);
});
