import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('./CommerceOrders.vue', import.meta.url), 'utf8');

describe('Asumi public Press hosting page contract', () => {
	it('explains public Bench delivery and exposes the linked Press Site and Agent Job', () => {
		expect(page).toContain('بنچ عمومی Press');
		expect(page).toContain('order.site');
		expect(page).toContain('order.agent_job');
		expect(page).toContain('check.detail');
	});

	it('does not present dedicated VPS fulfillment controls or HostIran setup fields', () => {
		expect(page).not.toMatch(/VPS|هاست‌ایران|HostIran|hostiran_/i);
	});

	it('requires explicit public Release Groups for new-site plan drafts', () => {
		expect(page).toContain('newSitePlan.release_groups');
		expect(page).toContain('release_groups: newSitePlan.release_groups');
		expect(page).not.toContain('release_groups: [], allowed_apps: newSitePlan.allowed_apps');
	});
});
