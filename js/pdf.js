/* global window, document */
/**
 * @file pdf.js
 * High-resolution PDF export reusing layout.labelXY (same mm as screen/print).
 * QR rendered with hd:true → scale ≥12 (≈600dpi equivalent), embedded as PNG
 * at exact mm box. Cut rectangles drawn hairline for laser; omitted on roll
 * thermal (would print a line across the gap).
 */
(function () {
  'use strict';

  /**
   * @param {string[]} data
   * @param {object} g geometry from main.collectGeom()
   * @param {{symKey:string, eclevel:string, quiet:number, showText:boolean, fontPt:number}} o
   * @param {string} [templateKey]
   * @param {string} [fileName] without or with .pdf
   */
  function downloadPDF(data, g, o, templateKey, fileName) {
    if (!data.length) { window.alert('Add data first.'); return; }
    var NS = window.QRStudioLayout, QR = window.QRStudioQR;
    var jspdf = window.jspdf || {};
    if (!jspdf.jsPDF) { window.alert('jsPDF CDN not loaded (offline?). Use Print → Save as PDF.'); return; }
    var doc;
    if (g.mode === 'roll') {
      var rollW = +(g.W + g.marginL * 2).toFixed(1);
      var stripH = +(g.marginT * 2 + data.length * (g.H + g.gapY + (g.sensorGap || 0))).toFixed(1);
      doc = new jspdf.jsPDF({ unit: 'mm', format: [rollW, Math.min(stripH, 3000)] });
    } else {
      var size = NS.pageSizeFor(g, templateKey && NS.TEMPLATES[templateKey] ? templateKey : null);
      if (size === '210mm 297mm') doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      else {
        var parts = size.replace(/mm/g, '').trim().split(/\s+/);
        doc = new jspdf.jsPDF({ unit: 'mm', format: [+parts[0], +parts[1]] });
      }
    }
    var pages = NS.paginate(g, data);
    for (var p = 0; p < pages.length; p++) {
      if (p > 0) doc.addPage();
      var chunk = pages[p];
      for (var i = 0; i < chunk.length; i++) {
        var pos = NS.labelXY(g, i);
        var cv = document.createElement('canvas');
        try { QR.renderToCanvas(cv, chunk[i], { key: o.symKey, eclevel: o.eclevel, quiet: o.quiet, hd: true }); }
        catch (e) { continue; }
        var img = cv.toDataURL('image/png');
        var pad = 2 + (o.quiet || 0) * 0.3;
        var box = Math.min(g.W, g.H - (o.showText ? 4 : 0)) - pad * 2;
        if (box < 6) box = 6;
        var cx = pos.x + (g.W - box) / 2, cy = pos.y + pad * 0.5;
        doc.addImage(img, 'PNG', cx, cy, box, box);
        if (o.showText) {
          doc.setFontSize(o.fontPt || 7);
          doc.setFont('courier', 'normal'); // system monospace → identical Win/Mac
          doc.text(String(chunk[i]).slice(0, 48), pos.x + g.W / 2, pos.y + g.H - 2, { align: 'center' });
        }
        // No border rect: preview dashed lines and old PDF rect are screen/cut guides only.
        // Print output has no borders, PDF must match it exactly.
      }
    }
    var safe = String(fileName || 'awizohub-labels').trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\.pdf$/i, '').slice(0, 120) || 'awizohub-labels';
    doc.save(safe + '.pdf');
  }

  window.QRStudioPDF = { downloadPDF: downloadPDF };
})();
