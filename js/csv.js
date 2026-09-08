/* global window */
/**
 * @file csv.js
 * Robust CSV/text parser for QR Label Studio.
 * Handles: BOM, separators , ; tab |, quoted fields, header row, per-line errors.
 * No dependencies. Works on file:// (classic script, no imports).
 */
(function () {
  'use strict';

  /**
   * Remove UTF-8 BOM if present.
   * @param {string} s
   * @returns {string}
   */
  function stripBOM(s) {
    if (s && s.charCodeAt(0) === 0xFEFF) return s.slice(1);
    return s;
  }

  /**
   * Detect separator by counting candidates in first non-empty lines.
   * @param {string[]} lines
   * @returns {{sep:string, name:string}}
   */
  function detectSeparator(lines) {
    var cands = [',', ';', '\t', '|'];
    var best = ',', bestScore = -1;
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i], score = 0;
      for (var j = 0; j < Math.min(lines.length, 5); j++) {
        if ((lines[j].split(c).length - 1) > 0) score++;
      }
      if (score > bestScore) { bestScore = score; best = c; }
    }
    // If no separator found at all, treat as single-column.
    if (bestScore <= 0) return { sep: '\n', name: 'newline (single column)' };
    var names = { ',': 'comma', ';': 'semicolon (EU Excel)', '\t': 'tab', '|': 'pipe' };
    return { sep: best, name: names[best] || best };
  }

  /**
   * Parse one CSV line respecting double quotes ("a;""b"";c").
   * @param {string} line
   * @param {string} sep
   * @returns {string[]}
   */
  function splitLine(line, sep) {
    if (sep === '\n') return [line];
    var out = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === sep && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim().replace(/^"|"$/g, ''); });
  }

  /** Header keywords (case-insensitive) that signal row 1 is a header. */
  var HEADER_HINTS = ['sku', 'url', 'qr', 'code', 'data', 'value', 'label', 'name', 'id', 'link', 'ean', 'upc'];

  /**
   * Parse full file/text content.
   * @param {string} raw Raw file text.
   * @param {{column:number}} [opts] column index to extract (0 = first).
   * @returns {{values:string[], errors:string[], separator:string, skippedHeader:boolean, totalLines:number}}
   */
  function parseCSVText(raw, opts) {
    opts = opts || {};
    var col = typeof opts.column === 'number' ? opts.column : 0;
    raw = stripBOM(String(raw || ''));
    var lines = raw.split(/\r?\n/);
    var nonEmpty = lines.filter(function (l) { return l.trim() !== ''; });
    if (!nonEmpty.length) return { values: [], errors: [], separator: 'none', skippedHeader: false, totalLines: 0 };

    var det = detectSeparator(nonEmpty);
    var sep = det.sep;
    var values = [], errors = [];
    var startIdx = 0, skippedHeader = false;

    // Header detection: first line's chosen cell matches a hint word exactly.
    var firstCells = splitLine(nonEmpty[0], sep);
    var firstCell = (firstCells[col] || firstCells[0] || '').toLowerCase();
    if (HEADER_HINTS.indexOf(firstCell) !== -1) { startIdx = 1; skippedHeader = true; }

    for (var i = startIdx; i < nonEmpty.length; i++) {
      var cells = splitLine(nonEmpty[i], sep);
      var v = (cells[col] !== undefined ? cells[col] : cells[0] || '').trim();
      var lineNo = i + 1 + (nonEmpty.length !== lines.length ? 0 : 0);
      if (!v) { errors.push('Line ' + lineNo + ': empty after parsing — skipped.'); continue; }
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(v)) { errors.push('Line ' + lineNo + ': control characters removed.'); v = v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); }
      if (v) values.push(v);
    }
    return { values: values, errors: errors, separator: det.name, skippedHeader: skippedHeader, totalLines: nonEmpty.length };
  }

  window.QRStudioCSV = { parseCSVText: parseCSVText, detectSeparator: detectSeparator, splitLine: splitLine };
})();
