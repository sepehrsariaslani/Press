import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builtShell = resolve(appRoot, '../../press/public/asumi_site/index.html');
const frappeShell = resolve(appRoot, '../../press/www/asumi.html');

await copyFile(builtShell, frappeShell);
