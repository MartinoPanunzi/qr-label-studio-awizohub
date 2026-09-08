/* global window */
/**
 * @file validate.js
 * Data validation: empty lines, duplicates, QR capacity, symbology charsets.
 * Symbology failures are AGGREGATED into a single box (anti-spam, same mode
 * as duplicates) instead of one box per line.
 */
(function () {
  'use strict';

  var QR_BYTE_MAX = 2953; // QR byte mode, version 40-L. Warn well before.
  var QR_WARN_AT = 1500;
  var CODE128_RE = /^[\x20-\x7E]*$/; // printable ASCII subset used by bwip-js
  var MAX_LABELS_SOFT = 2000;

  /**
   * @param {string[]} values
   * @param {string} bcid e.g. 'qrcode' | 'code128' | 'datamatrix' | 'ean13' | 'pdf417' | 'aztec'
   * @returns {{valid:string[], warnings:string[], errors:string[], duplicates:string[]}}
   */
  function validateAll(values, bcid) {
    var warnings = [], errors = [], seen = {}, duplicates = [], valid = [];
    if (!values.length) {
      errors.push('No data: paste at least 1 line or upload a CSV.');
      return { valid: valid, warnings: warnings, errors: errors, duplicates: duplicates };
    }
    if (values.length > MAX_LABELS_SOFT) {
      warnings.push(values.length + ' labels: preview is paginated (200/page) for speed; print/PDF still include all.');
    }
    var symBad = 0, symFirst = 0, symLast = 0, symMsg = '';
    var longWarn = 0;
    function symFail(lineNo, msg) {
      symBad++;
      if (!symFirst) symFirst = lineNo;
      symLast = lineNo;
      symMsg = msg;
    }
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      var lineNo = i + 1;
      if (!v || !v.trim()) { errors.push('Line ' + lineNo + ': empty - skipped.'); continue; }
      v = v.trim();
      if (seen[v]) { duplicates.push(v); continue; } // keep first occurrence only
      seen[v] = true;
      if (bcid === 'qrcode' && v.length > QR_BYTE_MAX) {
        symFail(lineNo, 'exceeds QR max (' + QR_BYTE_MAX + ' chars)');
        continue;
      }
      if (bcid === 'qrcode' && v.length > QR_WARN_AT) { longWarn++; continue; }
      if (bcid === 'code128' && !CODE128_RE.test(v)) {
        symFail(lineNo, 'Code128 needs printable ASCII');
        continue;
      }
      if (bcid === 'datamatrix' && v.length > 2335) {
        symFail(lineNo, 'exceeds DataMatrix max');
        continue;
      }
      // NOTE: EAN-13 intentionally NOT pre-filtered here. Non-numeric data
      // passes validation and fails at render time, showing the in-label
      // red error inside each preview label (same as Aztec).
      if (bcid === 'pdf417' && v.length > 1100) {
        symFail(lineNo, 'exceeds PDF417 max (~1100 chars)');
        continue;
      }
      if (bcid === 'aztec' && v.length > 3000) {
        symFail(lineNo, 'exceeds Aztec max');
        continue;
      }
      valid.push(v);
    }
    if (symBad === 1) errors.push('Line ' + symFirst + ': ' + symMsg + ' - skipped.');
    else if (symBad > 1) errors.push(symBad + ' lines (e.g. ' + symFirst + '-' + symLast + '): ' + symMsg + ' - skipped.');
    if (longWarn === 1) warnings.push('1 long line: dense QR, print larger or use EC-Q.');
    else if (longWarn > 1) warnings.push(longWarn + ' long lines: dense QR, print larger or use EC-Q.');
    if (duplicates.length) warnings.push(duplicates.length + ' duplicate(s) removed (kept first).');
    return { valid: valid, warnings: warnings, errors: errors, duplicates: duplicates };
  }

  window.QRStudioValidate = { validateAll: validateAll, QR_BYTE_MAX: QR_BYTE_MAX };
})();
