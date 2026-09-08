/* global window */
/**
 * @file layout.js
 * Single source of truth for geometry (mm). Screen preview, @page, and PDF
 * ALL derive from here → they can never drift apart (client test #1).
 *
 * Sheet = paginated grid on fixed page (A4 or 4x6").
 * Roll  = continuous strip: 1 column, N labels, page width = label + margins,
 *         gap sensor = physical black-mark gap between labels (gapY doubles as sensor gap).
 */
(function () {
  'use strict';

  /** Built-in templates (client acceptance: 3+ sizes). */
  var TEMPLATES = {
    avery7160:  { labelW: 63.5, labelH: 38.1, gapX: 2.5, gapY: 0, cols: 3, rows: 7, marginL: 7, marginT: 13, pageW: 210, pageH: 297, mode: 'sheet', desc: 'A4 sheet laser/inkjet' },
    dymo30334:  { labelW: 50,   labelH: 30,   gapX: 0,   gapY: 2, cols: 1, rows: 0,  marginL: 2,   marginT: 2,  pageW: 54,  pageH: 0,   mode: 'roll',  desc: 'Thermal roll + gap sensor 2mm' },
    ship4x6:    { labelW: 102,  labelH: 152,  gapX: 0,   gapY: 0, cols: 1, rows: 1,  marginL: 0,   marginT: 0,  pageW: 102, pageH: 152, mode: 'sheet', desc: 'Shipping 4x6 single' },
    mini40x30:  { labelW: 40,   labelH: 30,   gapX: 3,   gapY: 3, cols: 4, rows: 8,  marginL: 9,   marginT: 13, pageW: 210, pageH: 297, mode: 'sheet', desc: 'Mini A4 sheet' }
  };

  /**
   * @typedef {Object} Geom
   * @property {number} W,H,gapX,gapY,cols,rows,marginL,marginT,offX,offY,radius,fontPt,quiet,logoH,sensorGap
   * @property {string} mode 'sheet'|'roll'
   */

  /**
   * Position of label idx on its page (mm, including calibration offsets).
   * @param {Geom} g
   * @param {number} idx index within page
   * @returns {{x:number,y:number}}
   */
  function labelXY(g, idx) {
    if (g.mode === 'roll') {
      return { x: g.marginL, y: g.marginT + idx * (g.H + g.gapY + (g.sensorGap || 0)) };
    }
    var col = idx % g.cols, row = Math.floor(idx / g.cols);
    return {
      x: g.marginL + (g.offX || 0) + col * (g.W + g.gapX),
      y: g.marginT + (g.offY || 0) + row * (g.H + g.gapY)
    };
  }

  /**
   * Split flat data into pages.
   * @param {Geom} g
   * @param {string[]} data
   * @returns {string[][]}
   */
  function paginate(g, data) {
    if (g.mode === 'roll') return [data.slice()]; // one continuous strip
    var per = Math.max(1, g.cols * g.rows), pages = [];
    for (var i = 0; i < data.length; i += per) pages.push(data.slice(i, i + per));
    return pages;
  }

  /**
   * @page size for Chrome.
   * @param {Geom} g
   * @returns {string} e.g. "210mm 297mm" or "54mm auto"
   */
  function pageSizeFor(g, templateKey) {
    if (g.mode === 'roll') return ((g.W + g.marginL * 2).toFixed(1) + 'mm auto');
    var t = templateKey && TEMPLATES[templateKey];
    if (t && t.pageW) return (t.pageW + 'mm ' + t.pageH + 'mm');
    // Sheet always prints on A4 (or 4x6 handled via template above).
    // NEVER collapse page to label size — that produced the single-column bug.
    return '210mm 297mm';
  }

  /**
   * Check if grid overflows the sheet width. Returns warning string or null.
   * @param {Geom} g
   * @param {number} pageW
   * @returns {string|null}
   */
  function overflowWarning(g, pageW) {
    if (g.mode !== 'sheet') return null;
    var need = g.marginL * 2 + g.cols * g.W + (g.cols - 1) * g.gapX;
    // 1mm tolerance: printers drift ±1mm; old 0.01 threshold flagged the default Avery (210.5 vs 210).
    if (need > pageW + 1.0) {
      return 'Overflow: need ' + need.toFixed(1) + 'mm but page is ' + pageW + 'mm — reduce W or Cols.';
    }
    return null;
  }

  window.QRStudioLayout = { TEMPLATES: TEMPLATES, labelXY: labelXY, paginate: paginate, pageSizeFor: pageSizeFor, overflowWarning: overflowWarning };
})();
