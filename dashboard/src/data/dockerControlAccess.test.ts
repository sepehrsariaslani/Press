import { describe, expect, it } from 'vitest';
import { canAccessDockerControl, isDockerControlOnlyUser } from './dockerControlAccess';

describe('Docker Control route access', () => {
	it('allows the global Press administrator', () => {
		expect(canAccessDockerControl({ isSystemManager: true })).toBe(true);
	});

	it('allows users with an explicit mapped-site grant', () => {
		expect(canAccessDockerControl({ canAccessDockerControl: true })).toBe(true);
	});

	it('does not infer access from an unrelated Press Member account', () => {
		expect(canAccessDockerControl({ isSystemManager: false, canAccessDockerControl: false })).toBe(false);
		expect(canAccessDockerControl({})).toBe(false);
	});

	it('limits mapped site administrators to the Docker Control page', () => {
		expect(isDockerControlOnlyUser({ canAccessDockerControl: true, canManageDockerControlHost: false })).toBe(true);
		expect(isDockerControlOnlyUser({ canAccessDockerControl: true, canManageDockerControlHost: true })).toBe(false);
		expect(isDockerControlOnlyUser({ isSystemManager: true, canAccessDockerControl: true })).toBe(false);
	});
});
