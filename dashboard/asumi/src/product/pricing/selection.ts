import { productModules, type ProductModule } from '../modules';
import { modulePrerequisites } from './catalog';

export type ModuleId = ProductModule['id'];

function addPrerequisites(moduleId: ModuleId, result: Set<ModuleId>) {
	for (const prerequisite of modulePrerequisites[moduleId]) {
		addPrerequisites(prerequisite, result);
		result.add(prerequisite);
	}
}

export function addModule(current: readonly ModuleId[], moduleId: ModuleId) {
	const selected = new Set(current);
	const required = new Set<ModuleId>();
	addPrerequisites(moduleId, required);
	for (const requiredId of required) selected.add(requiredId);
	selected.add(moduleId);
	const next = productModules.map(module => module.id).filter(id => selected.has(id));
	return { selected: next, added: next.filter(id => !current.includes(id)) };
}

export function getSelectedDependents(current: readonly ModuleId[], moduleId: ModuleId) {
	return current.filter(selectedId => selectedId !== moduleId && requires(selectedId, moduleId));
}

function requires(moduleId: ModuleId, prerequisiteId: ModuleId): boolean {
	return modulePrerequisites[moduleId].some(id => id === prerequisiteId || requires(id, prerequisiteId));
}

export function removeModule(current: readonly ModuleId[], moduleId: ModuleId) {
	const dependents = getSelectedDependents(current, moduleId);
	return {
		selected: dependents.length ? [...current] : current.filter(id => id !== moduleId),
		blockedBy: dependents,
	};
}

export function validSavedModules(value: unknown): ModuleId[] {
	if (!Array.isArray(value)) return [];
	const available = new Set(productModules.map(module => module.id));
	return value.filter((id): id is ModuleId => typeof id === 'string' && available.has(id as ModuleId));
}
