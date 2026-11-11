// A small PDF writer: one full-page JPEG per sheet. The JPEGs go into the
// file as they are, so a long board is never copied into memory.
const enc = new TextEncoder();

// sheets: [{ w, h (points), jpeg (Blob), pxW, pxH }]
export function makePdf(sheets) {
  const parts = [];
  const offsets = [];
  let size = 0;
  const put = (v) => {
    const b = typeof v === 'string' ? enc.encode(v) : v;
    parts.push(b);
    size += b instanceof Blob ? b.size : b.length;
  };
  const obj = (id, write) => { offsets[id] = size; put(`${id} 0 obj\n`); write(); put('\nendobj\n'); };

  // 1 catalog, 2 page list, then per sheet: image, page, content.
  const ids = sheets.map((_, i) => 3 + i * 3);
  const next = 3 + sheets.length * 3;
  put('%PDF-1.4\n');
  put(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => put(`<< /Type /Pages /Count ${sheets.length} /Kids [${ids.map((id) => `${id + 1} 0 R`).join(' ')}] >>`));
  sheets.forEach((s, i) => {
    const im = ids[i];
    obj(im, () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${s.pxW} /Height ${s.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.jpeg.size} >>\nstream\n`);
      put(s.jpeg);
      put('\nendstream');
    });
    obj(im + 1, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${s.w.toFixed(2)} ${s.h.toFixed(2)}] /Contents ${im + 2} 0 R /Resources << /XObject << /Im ${im} 0 R >> >> >>`));
    const stream = enc.encode(`q ${s.w.toFixed(2)} 0 0 ${s.h.toFixed(2)} 0 0 cm /Im Do Q\n`);
    obj(im + 2, () => { put(`<< /Length ${stream.length} >>\nstream\n`); put(stream); put('\nendstream'); });
  });
  const xref = size;
  let table = `xref\n0 ${next}\n0000000000 65535 f \n`;
  for (let id = 1; id < next; id++) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  put(table);
  put(`trailer\n<< /Size ${next} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
