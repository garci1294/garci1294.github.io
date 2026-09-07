import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'dist');
const html = await readFile(join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.includes(id)) throw new Error(`Missing anchor: ${id}`);
}
for (const [, path] of html.matchAll(/(?:src|href)="((?:assets\/|styles\.css|script\.js)[^"]*)"/g)) {
  await readFile(join(root, path));
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'script.js', 'assets']) {
  await cp(join(root, path), join(output, path), { recursive: true });
}
console.log('Static site built successfully. All local assets and section links verified.');
