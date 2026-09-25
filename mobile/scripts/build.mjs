// Arma mobile/www: el juego de ../src con los controles táctiles delante,
// en un solo bundle, más el index.html de mobile.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
mkdirSync(www, { recursive: true });

await build({
  entryPoints: [join(root, 'src', 'entry.js')],
  bundle: true,
  format: 'iife',
  outfile: join(www, 'game.js'),
  minify: true,
});
copyFileSync(join(root, 'src', 'index.html'), join(www, 'index.html'));
console.log('mobile/www listo');
