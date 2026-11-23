// packages/community/image-bounds.mjs
async function imageBounds(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer()), v = new DataView(bytes.buffer), n = bytes.length, ascii = (p, s) => p + s.length <= n && s.split("").every((c, i) => bytes[p + i] === c.charCodeAt(0));
  let width = 0, height = 0;
  if (n >= 24 && bytes[0] === 137 && ascii(1, "PNG\r\n\n") && ascii(12, "IHDR")) {
    width = v.getUint32(16);
    height = v.getUint32(20);
  } else if (n >= 30 && ascii(0, "RIFF") && ascii(8, "WEBP")) {
    if (ascii(12, "VP8X")) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (ascii(12, "VP8 ") && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = v.getUint16(26, true) & 16383;
      height = v.getUint16(28, true) & 16383;
    } else if (ascii(12, "VP8L") && bytes[20] === 47) {
      const bits = v.getUint32(21, true);
      width = (bits & 16383) + 1;
      height = (bits >>> 14 & 16383) + 1;
    }
  } else if (n >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 4 <= n) {
      if (bytes[p++] !== 255) break;
      while (p < n && bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (p + 2 > n) break;
      const size = v.getUint16(p);
      if (size < 2 || p + size > n) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && size >= 7) {
        height = v.getUint16(p + 3);
        width = v.getUint16(p + 5);
        break;
      }
      p += size;
    }
  }
  if (!width || !height) throw Error("\u65E0\u6CD5\u8BFB\u53D6\u56FE\u7247\u5C3A\u5BF8\uFF0C\u8BF7\u91CD\u65B0\u4FDD\u5B58\u4E3A PNG\u3001JPG \u6216 WebP");
  if (width > 16e3 || height > 16e3 || width * height > 24e6) throw Error("\u56FE\u7247\u5C3A\u5BF8\u8FC7\u5927\uFF0C\u8BF7\u7F29\u5C0F\u81F3 2400 \u4E07\u50CF\u7D20\u4EE5\u5185");
  return { width, height };
}
async function boundedBitmap(blob, max = 2048) {
  const size = await imageBounds(blob), scale = Math.min(1, max / Math.max(size.width, size.height));
  return createImageBitmap(blob, { resizeWidth: Math.max(1, Math.round(size.width * scale)), resizeHeight: Math.max(1, Math.round(size.height * scale)), resizeQuality: "high" });
}

// packages/community/image-upload.mjs
async function communityImage(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) throw Error("\u8BF7\u9009\u62E9 12 MB \u4EE5\u5185\u7684 PNG\u3001JPG \u6216 WebP \u56FE\u7247");
  const image = await boundedBitmap(file, 1200);
  try {
    let size = 1200;
    for (let i = 0; i < 5; i++, size = Math.round(size * 0.72)) {
      const scale = Math.min(1, size / Math.max(image.width, image.height)), canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      if (data.length < 135e4) return data;
    }
    throw Error("\u56FE\u7247\u4ECD\u7136\u8FC7\u5927\uFF0C\u8BF7\u9009\u62E9\u8F83\u5C0F\u7684\u56FE\u7247");
  } finally {
    image.close();
  }
}
export {
  communityImage
};
