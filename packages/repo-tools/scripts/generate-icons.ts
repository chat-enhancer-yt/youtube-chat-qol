/*
 * Icon generation script.
 *
 * Rasterizes the source SVG into the Chrome-required PNG sizes. The SVG stays
 * as the editable source of truth for extension icons.
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..', '..', '..');
const iconDir = path.join(root, 'apps', 'extension', 'src', 'assets', 'icons');
const sourcePath = path.join(iconDir, 'icon.svg');
const sizes = [16, 32, 48, 128];

export async function generateIcons(outputDir = path.join(root, 'dist', 'generated-icons')) {
  const source = await readFile(sourcePath);
  await mkdir(outputDir, { recursive: true });

  for (const size of sizes) {
    await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));

    await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .grayscale()
      .modulate({ brightness: 1.18 })
      .png()
      .toFile(path.join(outputDir, `icon-inactive-${size}.png`));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await generateIcons();
}
