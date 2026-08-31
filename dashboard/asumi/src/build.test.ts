import packageJson from '../../../package.json';
import { expect, test } from 'vitest';

test('root build includes the Asumi application', () => {
	expect(packageJson.scripts['build-all']).toContain('build-asumi-app');
});
