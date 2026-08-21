#!/usr/bin/env node
/* xlsx-to-csv.js — dependency-free .xlsx -> CSV (stdout). Usage: node scripts/xlsx-to-csv.js file.xlsx [sheetName] */
"use strict";
const fs = require("fs"), zlib = require("zlib");

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--)
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip/xlsx file (no end-of-central-directory)");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("bad central directory");
    const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20),
      nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32),
      lofs = buf.readUInt32LE(off + 42),
      name = buf.slice(off + 46, off + 46 + nlen).toString("utf8");
    const lnlen = buf.readUInt16LE(lofs + 26), lelen = buf.readUInt16LE(lofs + 28);
    const data = buf.slice(lofs + 30 + lnlen + lelen, lofs + 30 + lnlen + lelen + csize);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    off += 46 + nlen + elen + clen;
  }
  return files;
}
const dec = s => s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const texts = xml => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => dec(m[1])).join("");

const file = process.argv[2], wantSheet = process.argv[3];
if (!file) { console.error("usage: node scripts/xlsx-to-csv.js <file.xlsx> [sheetName]"); process.exit(2); }
const z = unzip(fs.readFileSync(file));
const shared = [];
if (z["xl/sharedStrings.xml"])
  for (const m of z["xl/sharedStrings.xml"].toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(texts(m[1]));
const wb = z["xl/workbook.xml"].toString("utf8");
const rels = {};
for (const m of z["xl/_rels/workbook.xml.rels"].toString("utf8").matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?>/g))
  rels[m[1]] = m[2].replace(/^\/?(xl\/)?/, "xl/");
const sheets = [...wb.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g)].map(m => ({ name: dec(m[1]), path: rels[m[2]] }));
if (!sheets.length) throw new Error("no sheets found");
const sheet = wantSheet ? sheets.find(s => s.name === wantSheet) : sheets[0];
if (!sheet) throw new Error(`sheet "${wantSheet}" not found; have: ${sheets.map(s => s.name).join(", ")}`);
const xml = z[sheet.path].toString("utf8");
const colIx = ref => { let c = 0; for (const ch of ref) c = c * 26 + (ch.charCodeAt(0) - 64); return c - 1; };
const rows = [];
for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
  const row = [];
  for (const cm of rm[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = cm[1], body = cm[2] || "";
    const r = /r="([A-Z]+)\d+"/.exec(attrs), t = /t="(\w+)"/.exec(attrs);
    const ix = r ? colIx(r[1]) : row.length;
    let v = "";
    if (t && t[1] === "inlineStr") v = texts(body);
    else { const vm = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body); v = vm ? dec(vm[1]) : ""; }
    if (t && t[1] === "s") v = shared[+v] ?? "";
    if (t && t[1] === "b") v = v === "1" ? "TRUE" : "FALSE";
    row[ix] = v;
  }
  rows.push(row);
}
const width = Math.max(...rows.map(r => r.length));
const q = v => { v = v == null ? "" : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
process.stdout.write(rows.map(r => Array.from({ length: width }, (_, i) => q(r[i])).join(",")).join("\n") + "\n");
