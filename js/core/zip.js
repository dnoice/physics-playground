/*
✒ Metadata
    - Title: ZIP Writer (digiSpace Edition - v2.16)
    - File Name: zip.js
    - Relative Path: js/core/zip.js
    - Artifact Type: javascript
    - Version: 2.16.0
    - Date: 11/16/2026
    - Update: Monday, November 16, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.16.0 (11/16/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's call for datasets that explain themselves: a dataset's
      files, its README and its data package leave together in one archive.
    Earlier entries: see CHANGELOG.md

✒ Description:
    A small ZIP writer for the browser. It stores files as they are, with no
    compression, which every unzip tool and operating system opens. CSV and
    JSON compress well, but storing keeps this short, fast and dependency
    free.

✒ Key Features:
    - zip([{ name, blob }]) resolves to a Blob of type application/zip.
    - CRC-32 from a table built once; UTF-8 file names, flagged as such.
    - The archive's date and time are the moment it was made, in local time,
      as ZIP's DOS format expects.

✒ Other Important Information:
    - Dependencies: none
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
    - Limits: ZIP without the ZIP64 extension, so each file and the whole
      archive stay under 4 GiB, far above anything the Library holds.
---------
*/
let CRC = null;
function crc32(bytes) {
  if (!CRC) {
    CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
/* The DOS date and time ZIP records, in local time. */
function dosStamp(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}
/* Store each file uncompressed: local header and data, then the central directory, then its end record. */
export async function zip(files) {
  const enc = new TextEncoder(), { time, date } = dosStamp(), parts = [], dir = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = new Uint8Array(await f.blob.arrayBuffer()), crc = crc32(data), size = data.length;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
    local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true); local.setUint32(18, size, true); local.setUint32(22, size, true);
    local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    parts.push(local, name, data);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true); central.setUint16(8, 0x0800, true); central.setUint16(10, 0, true);
    central.setUint16(12, time, true); central.setUint16(14, date, true); central.setUint32(16, crc, true); central.setUint32(20, size, true); central.setUint32(24, size, true);
    central.setUint16(28, name.length, true); central.setUint16(30, 0, true); central.setUint16(32, 0, true); central.setUint16(34, 0, true); central.setUint16(36, 0, true);
    central.setUint32(38, 0, true); central.setUint32(42, offset, true);
    dir.push(central, name);
    offset += 30 + name.length + size;
  }
  const dirSize = dir.reduce((a, p) => a + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, dirSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
  return new Blob([...parts, ...dir, end], { type: 'application/zip' });
}
