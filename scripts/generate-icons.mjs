import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function createPNG(size) {
  // Create a simple icon: dark background with amber lock shape
  const pixels = Buffer.alloc(size * size * 4);

  const bg = [14, 14, 15, 255];       // #0e0e0f
  const amber = [245, 166, 35, 255];  // #f5a623
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 512;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let color = bg;

      // Lock body (rounded rect)
      const bodyW = 160 * scale;
      const bodyH = 120 * scale;
      const bodyX = cx - bodyW / 2;
      const bodyY = cy - bodyH / 2 + 30 * scale;

      if (x >= bodyX && x <= bodyX + bodyW && y >= bodyY && y <= bodyY + bodyH) {
        color = amber;
      }

      // Shackle (arc)
      const dx = x - cx;
      const dy = y - (cy - 20 * scale);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const shackleR = 50 * scale;
      const thickness = 12 * scale;
      if (dy <= 0 && Math.abs(dist - shackleR) < thickness) {
        color = amber;
      }

      // Keyhole (circle + rect)
      const kdx = x - cx;
      const kdy = y - (bodyY + bodyH * 0.4);
      const kDist = Math.sqrt(kdx * kdx + kdy * kdy);
      if (kDist < 16 * scale) {
        color = bg;
      }
      if (Math.abs(x - cx) < 6 * scale && y > bodyY + bodyH * 0.4 && y < bodyY + bodyH * 0.4 + 30 * scale) {
        color = bg;
      }

      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3];
    }
  }

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const combined = Buffer.concat([typeB, data]);
    const crc = crc32(combined);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, combined, crcB]);
  }

  // CRC32
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA

  // IDAT
  const rawData = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    rawData[y * (1 + size * 4)] = 0; // filter none
    pixels.copy(rawData, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = deflateSync(rawData);

  // IEND
  const iend = Buffer.alloc(0);

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend)
  ]);

  return png;
}

writeFileSync('public/icons/icon-192.png', createPNG(192));
writeFileSync('public/icons/icon-512.png', createPNG(512));
console.log('Icons generated.');
