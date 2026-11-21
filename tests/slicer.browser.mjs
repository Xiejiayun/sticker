import JSZip from './jszip.js';
import { exportSingleStickerPng, exportStickerPackZip, sliceStickerPreview } from './sticker-processor.js';

// Real browser Canvas/PNG regression checks; no AI, account or backend needed.
const output = document.querySelector('pre');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const canvas = (w, h = w) => Object.assign(document.createElement('canvas'), { width: w, height: h });
async function decode(blob) {
  const bitmap = await createImageBitmap(blob);
  const result = canvas(bitmap.width, bitmap.height);
  result.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  return result;
}
function pixels(image) { return image.getContext('2d').getImageData(0, 0, image.width, image.height).data; }
function matchesCrop(image, source, x, y, w, h) {
  assert(image.width === w && image.height === h, `Wrong dimensions: ${image.width}x${image.height}, expected ${w}x${h}`);
  const actual = pixels(image);
  const expected = source.getContext('2d').getImageData(x, y, w, h).data;
  assert(actual.every((v, i) => v === expected[i]), `Crop pixels differ at ${x},${y}`);
}
let passed = 0;
async function test(name, run) {
  await run();
  passed++;
  output.textContent += `PASS ${name}\n`;
}
async function run() {
  const source = canvas(2048);
  const ctx = source.getContext('2d');
  const pattern = ctx.createImageData(2048, 2048);
  for (let y = 0; y < 2048; y++) for (let x = 0; x < 2048; x++) {
    const i = (y * 2048 + x) * 4;
    pattern.data.set([x % 256, y % 256, (x + y) % 256, 255], i);
  }
  ctx.putImageData(pattern, 0, 0);
  const url = source.toDataURL('image/png');
  for (const n of [3, 4]) {
    const options = { gridSize: `${n}x${n}`, removeBackground: false, tolerance: 32, whiteBorderPx: 0 };
    await test(`${n}x${n}: native PNGs preserve every source pixel, including cell edges`, async () => {
      for (let i = 0; i < n * n; i++) {
        const row = Math.floor(i / n), col = i % n;
        const x = Math.floor(col * 2048 / n), y = Math.floor(row * 2048 / n);
        const w = Math.floor((col + 1) * 2048 / n) - x;
        const h = Math.floor((row + 1) * 2048 / n) - y;
        matchesCrop(await decode(await exportSingleStickerPng(url, i, options, 'original')), source, x, y, w, h);
      }
    });
    await test(`${n}x${n}: ZIP contains all named PNGs with correct pixels and dimensions`, async () => {
      const blob = await exportStickerPackZip(url, options, 'original', Array(n * n).fill('Hello!'));
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      assert(Object.keys(zip.files).length === n * n, 'Incorrect ZIP entry count');
      for (let i = 0; i < n * n; i++) {
        const entry = zip.file(`sticker_${String(i + 1).padStart(2, '0')}_Hello.png`);
        assert(entry, 'Missing ZIP file');
        const row = Math.floor(i / n), col = i % n;
        const x = Math.floor(col * 2048 / n), y = Math.floor(row * 2048 / n);
        matchesCrop(await decode(await entry.async('blob')), source, x, y,
          Math.floor((col + 1) * 2048 / n) - x, Math.floor((row + 1) * 2048 / n) - y);
      }
    });
    await test(`${n}x${n}: previews and fixed-size presets keep opaque edges without added padding`, async () => {
      const previews = await sliceStickerPreview(url, options);
      assert(previews.length === n * n, 'Incorrect preview count');
      for (const [preset, size] of [['wechat', 240], ['telegram', 512]]) {
        const result = await decode(await exportSingleStickerPng(url, 0, options, preset));
        assert(result.width === size && result.height === size, 'Wrong preset dimensions');
        const data = pixels(result);
        assert(data[3] === 255 && data[data.length - 1] === 255, 'Extra transparent padding at edges');
      }
    });
  }
  await test('Background removal is optional; opaque white details survive default export', async () => {
    const solid = canvas(300);
    const s = solid.getContext('2d');
    s.fillStyle = 'white'; s.fillRect(0, 0, 300, 300);
    s.fillStyle = '#151525'; s.fillRect(20, 20, 60, 60);
    s.fillStyle = 'white'; s.fillRect(40, 40, 20, 20);
    const options = { gridSize: '3x3', removeBackground: false, tolerance: 32, whiteBorderPx: 0 };
    const url = solid.toDataURL();
    matchesCrop(await decode(await exportSingleStickerPng(url, 0, options, 'original')), solid, 0, 0, 100, 100);
    const cutout = await decode(await exportSingleStickerPng(url, 0, { ...options, removeBackground: true }, 'original'));
    const data = pixels(cutout);
    assert(data[3] === 0, 'Optional background removal did not clear corners');
    const center = (Math.floor(cutout.height / 2) * cutout.width + Math.floor(cutout.width / 2)) * 4;
    assert(data[center] === 255 && data[center + 3] === 255, 'Interior white highlight was removed');
  });
  document.title = `PASS ${passed} slicer browser checks`;
  output.textContent += `\n${passed} checks passed. No AI or production APIs called.`;
}
run().catch(error => {
  document.title = 'FAIL slicer browser checks';
  output.textContent += `\nFAIL ${error.stack}`;
});
