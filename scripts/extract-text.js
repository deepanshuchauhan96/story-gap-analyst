#!/usr/bin/env node
/* extract-text.js — dependency-free text extraction from .pdf and .docx (stdout).
   Usage: node scripts/extract-text.js file.pdf|file.docx
   PDF: digitally-authored PDFs (FlateDecode, literal + hex strings, ToUnicode CMaps).
   Scanned/image PDFs contain no text layer — attach those in chat instead. */
"use strict";
const fs = require("fs"), zlib = require("zlib"), path = require("path");

function unzip(buf) { /* same minimal reader as xlsx-to-csv */
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65536); i--)
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip container");
  const count = buf.readUInt16LE(eocd + 10); let off = buf.readUInt32LE(eocd + 16); const files = {};
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20),
      nlen = buf.readUInt16LE(off + 28), elen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32),
      lofs = buf.readUInt32LE(off + 42), name = buf.slice(off + 46, off + 46 + nlen).toString("utf8");
    const lnlen = buf.readUInt16LE(lofs + 26), lelen = buf.readUInt16LE(lofs + 28);
    const data = buf.slice(lofs + 30 + lnlen + lelen, lofs + 30 + lnlen + lelen + csize);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    off += 46 + nlen + elen + clen;
  }
  return files;
}
const decEnt = s => s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function docx(buf) {
  const z = unzip(buf), xml = z["word/document.xml"];
  if (!xml) throw new Error("no word/document.xml — not a .docx?");
  return xml.toString("utf8").split(/<\/w:p>/).map(p =>
    [...p.replace(/<w:tab\b[^>]*\/>/g, "\t").replace(/<w:br\b[^>]*\/>/g, "\n")
      .matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => decEnt(m[1])).join("")
  ).filter(t => t.trim().length || true).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function pdf(buf) {
  const raw = buf.toString("latin1");
  // 1. collect object bodies and decompressed streams
  const objs = {}, streams = [];
  for (const m of raw.matchAll(/(\d+)\s+\d+\s+obj\b([\s\S]*?)endobj/g)) {
    objs[m[1]] = m[2];
    const sm = /stream\r?\n/.exec(m[2]);
    if (sm) {
      const start = sm.index + sm[0].length, end = m[2].lastIndexOf("endstream");
      let data = Buffer.from(m[2].slice(start, end), "latin1");
      if (/\/FlateDecode/.test(m[2].slice(0, sm.index))) {
        try { data = zlib.inflateSync(data); } catch { try { data = zlib.inflateRawSync(data); } catch { data = null; } }
      }
      if (data) streams.push({ num: m[1], dict: m[2].slice(0, sm.index), text: data.toString("latin1") });
    }
  }
  // 2. merge all ToUnicode CMaps (global map: code -> string)
  const cmap = new Map();
  const hex2str = h => { let s = ""; for (let i = 0; i + 4 <= h.length; i += 4) s += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return s; };
  for (const st of streams) if (/beginbfchar|beginbfrange/.test(st.text)) {
    for (const b of st.text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
      for (const p of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g))
        cmap.set(parseInt(p[1], 16), hex2str(p[2].padStart(Math.ceil(p[2].length / 4) * 4, "0")));
    for (const b of st.text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
      for (const p of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16), d0 = parseInt(p[3], 16);
        for (let c = lo; c <= hi && c - lo < 65536; c++) cmap.set(c, String.fromCharCode(d0 + (c - lo)));
      }
  }
  // 3. walk content streams (those with text operators)
  const unesc = s => s.replace(/\\(\d{1,3}|.)/g, (_, e) => {
    if (/^\d/.test(e)) return String.fromCharCode(parseInt(e, 8));
    return { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\", "\n": "" }[e] ?? e;
  });
  const decHex = h => {
    if (h.length % 2) h += "0";
    if (cmap.size && h.length % 4 === 0) {
      let out = "", ok = true;
      for (let i = 0; i + 4 <= h.length; i += 4) {
        const c = parseInt(h.slice(i, i + 4), 16);
        if (cmap.has(c)) out += cmap.get(c); else { ok = false; break; }
      }
      if (ok) return out;
    }
    let s = ""; for (let i = 0; i + 2 <= h.length; i += 2) s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
    return s;
  };
  const out = [];
  for (const st of streams) {
    if (!/\bBT\b/.test(st.text) || /beginbfchar/.test(st.text)) continue;
    const toks = st.text.matchAll(/\(((?:\\.|[^\\()])*)\)\s*(Tj|'|")|<([0-9a-fA-F\s]+)>\s*(Tj|'|")|\[((?:\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>|[-\d.\s])*)\]\s*TJ|(T\*|TD|Td|ET)/g);
    for (const t of toks) {
      if (t[1] !== undefined) { if (t[2] !== "Tj") out.push("\n"); out.push(unesc(t[1])); }
      else if (t[3] !== undefined) { if (t[4] !== "Tj") out.push("\n"); out.push(decHex(t[3].replace(/\s/g, ""))); }
      else if (t[5] !== undefined) {
        for (const e of t[5].matchAll(/\(((?:\\.|[^\\()])*)\)|<([0-9a-fA-F\s]+)>|(-?[\d.]+)/g)) {
          if (e[1] !== undefined) out.push(unesc(e[1]));
          else if (e[2] !== undefined) out.push(decHex(e[2].replace(/\s/g, "")));
          else if (+e[3] < -180) out.push(" ");
        }
      } else if (t[6]) out.push("\n");
    }
    out.push("\n");
  }
  const text = out.join("").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("no text layer found — likely a scanned/image PDF; attach it in chat (Copilot vision) or OCR it");
  return text + "\n";
}

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/extract-text.js <file.pdf|file.docx>"); process.exit(2); }
const buf = fs.readFileSync(file), ext = path.extname(file).toLowerCase();
if (ext === ".docx") process.stdout.write(docx(buf));
else if (ext === ".pdf") process.stdout.write(pdf(buf));
else { console.error("unsupported extension: " + ext + " (supported: .pdf, .docx)"); process.exit(2); }
