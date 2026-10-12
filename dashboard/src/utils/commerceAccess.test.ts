import { describe, expect, it } from 'vitest';
import { canManageAsumiCommerce } from './commerceAccess';

describe('Asumi commerce access', () => {
	it('shows management tools to system managers and Press Admins', () => {
		expect(canManageAsumiCommerce({ isSystemManager: true })).toBe(true);
		expect(canManageAsumiCommerce({ isPressAdmin: true })).toBe(true);
		expect(canManageAsumiCommerce({ isSystemManager: false, isPressAdmin: false })).toBe(false);
	});
});
