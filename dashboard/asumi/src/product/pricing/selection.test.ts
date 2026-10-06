import { expect, test } from 'vitest';
import { addModule, getSelectedDependents, removeModule, validSavedModules } from './selection';

test('selecting a module adds its required modules exactly once', () => {
	const result = addModule([], 'manufacturing');
	expect(result.selected).toEqual(['inventory', 'manufacturing']);
	expect(result.added).toEqual(['inventory', 'manufacturing']);
	expect(addModule(result.selected, 'manufacturing').added).toEqual([]);
});

test('asset and business selections include their declared financial and growth prerequisites', () => {
	expect(addModule([], 'assets').selected).toEqual(['finance', 'assets']);
	expect(addModule([], 'business').selected).toEqual(['growth', 'business']);
});

test('a prerequisite cannot be removed while a selected module depends on it', () => {
	const selection = ['inventory', 'manufacturing'] as const;
	expect(getSelectedDependents(selection, 'inventory')).toEqual(['manufacturing']);
	expect(removeModule(selection, 'inventory')).toEqual({ selected: [...selection], blockedBy: ['manufacturing'] });
	expect(removeModule(selection, 'manufacturing')).toEqual({ selected: ['inventory'], blockedBy: [] });
});

test('saved module ids ignore invalid values and retain known selections', () => {
	expect(validSavedModules(['finance', 'unknown', 3, 'assets'])).toEqual(['finance', 'assets']);
	expect(validSavedModules(null)).toEqual([]);
});
