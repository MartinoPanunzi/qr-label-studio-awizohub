/* global window, bwipjs */
/**
 * @file qr.js
 * Symbology plugin registry + high-resolution rendering.
 *
 * WHY: single place to add symbologies; enforces print-safety rules
 * (EC minimum, quiet zone, DPI-aware scale) so every scanner reads first time.
 *
 * HOW to add a symbology (3 lines):
 *   QRStudioQR.registerSymbology('ean13', { bcid:'ean13', label:'EAN-13', scale:4, needsNumeric:true });
 * Then add <option value="ean13"> in index.html — render/PDF pick it up automatically.
 */
(function () {
  'use strict';

  /** @type {Object<string,{bcid:string,label:string,scale:number}>} */
  var SYMBOLOGIES = {
    qrcode:     { bcid: 'qrcode',     label: 'QR Code',   scale: 8 },
    code128:    { bcid: 'code128',    label: 'Code 128',  scale: 4 },
    datamatrix: { bcid: 'datamatrix', label: 'DataMatrix',scale: 6 },
    ean13:      { bcid: 'ean13',      label: 'EAN-13',    scale: 4 },
    pdf417:     { bcid: 'pdf417',     label: 'PDF417',    scale: 3 },
    aztec:      { bcid: 'aztec',      label: 'Aztec',     scale: 6 }
  };

  /**
   * Register (or override) a symbology at runtime.
   * @param {string} key
   * @param {{bcid:string,label:string,scale:number}} def
   */
  function registerSymbology(key, def) { SYMBOLOGIES[key] = def; }

  /** EC floor: never render QR weaker than M (15%) unless user explicitly picks L for tiny URLs. */
  function enforceEC(requested) {
    if (requested === 'L') return 'L'; // allowed, but UI warns
    return requested || 'M';
  }

  /**
   * DPI-aware scale: thermal 203dpi ≈ 8 dots/mm. For a label of W mm,
   * code box ~ (W-4)mm → need ≥ (W-4)*8 px. bwip scale multiplies modules,
   * so scale 8 is safe up to ~30 modules; bump to 10-12 for dense QR.
   * @param {string} text
   * @param {number} baseScale
   * @returns {number}
   */
  function dpiScale(text, baseScale) {
    if (text.length > 200) return Math.max(baseScale, 10);
    if (text.length > 80) return Math.max(baseScale, 9);
    return baseScale;
  }

  /**
   * Render one code onto a canvas.
   * @param {HTMLCanvasElement} cv
   * @param {string} text
   * @param {{key:string, eclevel:string, quiet:number, hd:boolean}} opts
   */
  function renderToCanvas(cv, text, opts) {
    var def = SYMBOLOGIES[opts.key] || SYMBOLOGIES.qrcode;
    var scale = dpiScale(text, def.scale);
    if (opts.hd) scale = Math.max(scale, 12); // PDF export: 600dpi-equivalent sharpness
    var bwipOpts = { bcid: def.bcid, text: text, scale: scale, includetext: false, padding: opts.quiet != null ? opts.quiet : 2 };
    if (def.bcid === 'qrcode') bwipOpts.eclevel = enforceEC(opts.eclevel);
    bwipjs.toCanvas(cv, bwipOpts);
  }

  window.QRStudioQR = { SYMBOLOGIES: SYMBOLOGIES, registerSymbology: registerSymbology, renderToCanvas: renderToCanvas };
})();
