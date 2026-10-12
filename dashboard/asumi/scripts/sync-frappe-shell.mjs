import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripFrappeCsrfPlaceholder } from './frappe-shell.mjs';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builtShell = resolve(appRoot, '../../press/public/asumi_site/index.html');
const frappeShell = resolve(appRoot, '../../press/www/asumi.html');

const shell = await readFile(builtShell, 'utf8');
await writeFile(frappeShell, stripFrappeCsrfPlaceholder(shell));
