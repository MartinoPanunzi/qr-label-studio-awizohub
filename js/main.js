/* global window, document, QRStudioCSV, QRStudioValidate, QRStudioQR, QRStudioLayout, QRStudioStore, QRStudioPrint, QRStudioPDF */
/**
 * @file main.js
 * Glue: controls → validate → layout → render. Classic script (file:// safe).
 * Performance: preview renders max 200 labels with pager; print/PDF use ALL data.
 */
(function () {
  'use strict';
  var PREVIEW_LIMIT = 200;
  var previewPage = 0;

  function $(id) { return document.getElementById(id); }

  function collectGeom() {
    return {
      W: +$('labelW').value || 50, H: +$('labelH').value || 30,
      gapX: +$('gapX').value || 0, gapY: +$('gapY').value || 0,
      cols: Math.max(1, +$('cols').value || 1), rows: Math.max(1, +$('rows').value || 1),
      marginL: +$('marginL').value || 0, marginT: +$('marginT').value || 0,
      offX: +$('offX').value || 0, offY: +$('offY').value || 0,
      radius: +($('radius') && $('radius').value || 0),
      sensorGap: +($('sensorGap') && $('sensorGap').value || 0),
      mode: $('mode').value
    };
  }
  function collectOpts() {
    return {
      symKey: $('symbology').value, eclevel: $('eclevel').value,
      quiet: +($('quiet') && $('quiet').value || 2),
      showText: $('showText').checked, fontPt: +($('fontPt') && $('fontPt').value || 7)
    };
  }
  function rawValues() {
    return $('dataInput').value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function showValidation(res, csvInfo) {
    var box = $('validationBox');
    var html = '';
    if (csvInfo) html += '<div class="vinfo">CSV: separator <b>' + csvInfo.separator + '</b>' +
      (csvInfo.skippedHeader ? ', header skipped' : '') +
      (csvInfo.errors.length ? ', ' + csvInfo.errors.length + ' line note(s)' : '') + '.</div>';
    res.errors.forEach(function (e) { html += '<div class="verr">⛔ ' + esc(e) + '</div>'; });
    res.warnings.forEach(function (w) { html += '<div class="vwarn">⚠ ' + esc(w) + '</div>'; });
    if (!res.errors.length && !res.warnings.length && res.valid.length)
      html = '<div class="vok">✓ ' + res.valid.length + ' labels ready — EC ' + $('eclevel').value + ', quiet zone ' + ($('quiet').value || 2) + '.</div>';
    box.innerHTML = html;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function updateCount(n) { $('count').textContent = n + ' label' + (n === 1 ? '' : 's'); }

  // ---------- Data: CSV ----------
  function handleCSV(e) {
    var f = e.target.files[0]; if (!f) return;
    QRStudioStore.pushUndo($('dataInput').value);
    var r = new FileReader();
    r.onload = function () {
      var col = +($('csvCol') ? $('csvCol').value || 0 : 0);
      var parsed = QRStudioCSV.parseCSVText(String(r.result), { column: col });
      var cur = $('dataInput').value.trim();
      $('dataInput').value = (cur ? cur + '\n' : '') + parsed.values.join('\n');
      $('csvInfo').textContent = 'sep: ' + parsed.separator + (parsed.skippedHeader ? ' · header skipped' : '') + ' · +' + parsed.values.length;
      scheduleAutosave(); updateCount(rawValues().length); renderAll(0);
    };
    r.readAsText(f, 'UTF-8');
    e.target.value = '';
  }

  // ---------- Templates ----------
  function refreshTemplateSelect() {
    var sel = $('template'), user = QRStudioStore.loadUserTemplates();
    var cur = sel.value;
    // remove old user options
    Array.from(sel.querySelectorAll('option[data-user]')).forEach(function (o) { o.remove(); });
    Object.keys(user).forEach(function (n) {
      var o = document.createElement('option'); o.value = 'user:' + n; o.textContent = '★ ' + n; o.setAttribute('data-user', '1');
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }
  function applyTemplate() {
    applyingTemplate = true;
    try {
    var v = $('template').value, t = null;
    if (v.indexOf('user:') === 0) t = QRStudioStore.loadUserTemplates()[v.slice(5)];
    else t = QRStudioLayout.TEMPLATES[v];
    if (!t) return;
    $('labelW').value = t.labelW; $('labelH').value = t.labelH;
    $('gapX').value = t.gapX; $('gapY').value = t.gapY;
    $('cols').value = t.cols || 1; $('rows').value = t.rows || 1;
    $('marginL').value = t.marginL; $('marginT').value = t.marginT;
    $('mode').value = t.mode || 'sheet';
    if ($('sensorGap') && t.sensorGap != null) $('sensorGap').value = t.sensorGap;
    scheduleAutosave();
    // Auto-refresh so dropdown and numbers can never disagree (reported sheet bug).
    if (rawValues().length) renderAll(0);
    } finally { applyingTemplate = false; }
  }

  // ---------- Fix 6: manual geom/mode edit detaches built-in template to Custom ----------
  // WHY: "Avery + Roll" must be impossible by definition. Any core change after
  // selecting a built-in/user template means it is no longer that template.
  // Calibration fields (offX/offY/radius/sensorGap) do NOT detach: ±1mm shift
  // still means "Avery".
  var applyingTemplate = false;
  var GEOM_CORE = ['labelW', 'labelH', 'gapX', 'gapY', 'cols', 'rows', 'marginL', 'marginT', 'mode'];
  function geomMatchesTemplate(g, t) {
    function num(a, b) { return Math.abs((+a || 0) - (+b || 0)) < 0.001; }
    var tw = (t.labelW != null ? t.labelW : t.W), th = (t.labelH != null ? t.labelH : t.H);
    if (!num(g.W, tw) || !num(g.H, th)) return false;
    if (!num(g.gapX, t.gapX) || !num(g.gapY, t.gapY)) return false;
    if (!num(g.marginL, t.marginL) || !num(g.marginT, t.marginT)) return false;
    if ((t.mode || 'sheet') !== g.mode) return false;
    if ((t.mode || 'sheet') === 'roll') return true; // rows/cols ignored on roll strip
    if (+g.cols !== +t.cols || +g.rows !== +t.rows) return false;
    return true;
  }
  function maybeMarkCustom() {
    if (applyingTemplate) return;
    var sel = $('template');
    if (!sel || !sel.value || sel.value === 'custom') return;
    var v = sel.value, t = null;
    if (v.indexOf('user:') === 0) t = QRStudioStore.loadUserTemplates()[v.slice(5)];
    else t = QRStudioLayout.TEMPLATES[v];
    if (!t) return;
    try {
      if (!geomMatchesTemplate(collectGeom(), t)) sel.value = 'custom';
    } catch (e) {}
  }

  // ---------- Render ----------
  var lastValid = [];
  function renderAll(page) {
    previewPage = page || 0;
    var g = collectGeom(), o = collectOpts();
    var res = QRStudioValidate.validateAll(rawValues(), (QRStudioQR.SYMBOLOGIES[o.symKey] || {}).bcid || 'qrcode');
    lastValid = res.valid;
    updateCount(res.valid.length);
    if (!res.valid.length) { showValidation(res, null); $('preview').innerHTML = ''; $('previewMeta').textContent = 'No valid data.'; return; }

    var tplKey = ($('template').value || '').replace('user:', '');
    if (QRStudioLayout.TEMPLATES[tplKey]) { /* known template: page from registry */ }
    else if (tplKey.indexOf && $('template').value.indexOf('user:') === 0) tplKey = null; // user tpl: A4 sheet
    QRStudioPrint.updatePageStyle(QRStudioLayout.pageSizeFor(g, QRStudioLayout.TEMPLATES[tplKey] ? tplKey : null));

    // Overflow guard: labels wider than page used to collapse into 1 column (reported bug).
    var ow = QRStudioLayout.overflowWarning(g, 210);
    if (ow) res.warnings.push(ow);
    // Mode/template mismatch guard: sheet template + roll mode (or viceversa)
    // produces single-column strip on A4 with cuts at page edge (reported bug).
    var tplDef = QRStudioLayout.TEMPLATES[tplKey];
    if (tplDef && tplDef.mode && tplDef.mode !== g.mode) {
      res.warnings.push('Template "' + ($('template').selectedOptions[0] ? $('template').selectedOptions[0].text : tplKey) + '" is ' + tplDef.mode.toUpperCase() + ' but Mode is ' + g.mode.toUpperCase() + ' — set Mode to ' + tplDef.mode.toUpperCase() + ' or labels split across pages.');
    }
    if (g.mode === 'roll' && g.cols > 1) {
      res.warnings.push('Roll mode ignores Cols (uses 1 continuous column) — set Cols=1 or switch Mode to Sheet for 3×7 grid.');
    }
    showValidation(res, null);

    // Preview window (virtualized)
    var start = previewPage * PREVIEW_LIMIT;
    var window_ = res.valid.slice(start, start + PREVIEW_LIMIT);
    var pages = QRStudioLayout.paginate(g, window_);
    var totalPages = Math.ceil(res.valid.length / (g.mode === 'roll' ? PREVIEW_LIMIT : Math.max(1, g.cols * g.rows)));
    $('previewMeta').textContent = res.valid.length + ' labels — ' + (g.mode === 'roll' ? 'ROLL ' : 'SHEET ') +
      g.W + '×' + g.H + 'mm' + (res.valid.length > PREVIEW_LIMIT ? ' — preview ' + (start + 1) + '–' + (start + window_.length) + ' (pager below; print/PDF include all)' : ' — ' + pages.length + ' page(s) in preview');
    renderPages($('preview'), pages, g, o);
    renderPager(res.valid.length);
    applyZoom();
  }

  function renderPages(mount, pages, g, o) {
    mount.innerHTML = '';
    var logoURL = mount._logoURL || null;
    var v = $('template') ? $('template').value : '';
    var tk = v.indexOf('user:') === 0 ? null : v;
    if (tk && !QRStudioLayout.TEMPLATES[tk]) tk = null;
    pages.forEach(function (chunk) {
      var page = document.createElement('div');
      page.className = 'page';
      if (g.mode === 'roll') {
        page.style.width = (g.W + g.marginL * 2) + 'mm';
        page.style.padding = g.marginT + 'mm ' + g.marginL + 'mm';
        page.style.flexDirection = 'column'; page.style.alignItems = 'center';
      } else {
        var size = QRStudioLayout.pageSizeFor(g, tk).split(' ');
        page.style.width = size[0];
        if (size[1] !== 'auto') page.style.minHeight = size[1];
        page.style.padding = 'calc(' + (g.marginT + g.offY) + 'mm) 0 0 calc(' + (g.marginL + g.offX) + 'mm)';
        page.style.gap = g.gapY + 'mm ' + g.gapX + 'mm';
      }
      chunk.forEach(function (text, i) {
        var pos = QRStudioLayout.labelXY(g, i); // same fn as PDF (single source of truth)
        void pos;
        var lab = document.createElement('div');
        lab.className = 'label';
        lab.style.width = g.W + 'mm'; lab.style.height = g.H + 'mm';
        if (g.radius) lab.style.borderRadius = g.radius + 'mm';
        if (g.mode === 'roll') lab.style.marginBottom = (g.gapY + (g.sensorGap || 0)) + 'mm';
        if (logoURL) {
          var im = document.createElement('img'); im.src = logoURL; im.alt = 'logo';
          im.style.cssText = 'max-height:5mm;max-width:80%;object-fit:contain;';
          lab.appendChild(im);
        }
        var cv = document.createElement('canvas');
        lab.appendChild(cv);
        if (o.showText) {
          var d = document.createElement('div');
          d.className = 'txt'; d.style.fontSize = (o.fontPt || 7) + 'pt';
          d.textContent = text.length > 48 ? text.slice(0, 48) + '…' : text;
          lab.appendChild(d);
        }
        page.appendChild(lab);
        try { QRStudioQR.renderToCanvas(cv, text, { key: o.symKey, eclevel: o.eclevel, quiet: o.quiet, hd: false }); }
        catch (err) {
          lab.style.borderColor = 'red';
          lab.title = 'Encode error: ' + err;
          cv.style.display = 'none'; // hide empty canvas so error is visible
          var em = document.createElement('div');
          em.style.cssText = 'color:#b91c1c;font-size:8pt;font-weight:700;text-align:center;padding:2mm;';
          em.textContent = '✕ Cannot encode as ' + o.symKey + ' — switch to QR Code for URLs';
          lab.insertBefore(em, lab.firstChild);
        }
      });
      mount.appendChild(page);
    });
  }

  function renderPager(total) {
    var el = $('pager');
    if (total <= PREVIEW_LIMIT) { el.innerHTML = ''; return; }
    var n = Math.ceil(total / PREVIEW_LIMIT);
    el.innerHTML = '<button class="btn small" id="pgPrev">◀ Prev</button> <span>Preview page ' + (previewPage + 1) + '/' + n + '</span> <button class="btn small" id="pgNext">Next ▶</button>';
    $('pgPrev').onclick = function () { if (previewPage > 0) renderAll(previewPage - 1); };
    $('pgNext').onclick = function () { if (previewPage < n - 1) renderAll(previewPage + 1); };
  }

  // ---------- Hybrid gate: preview shows ALL (red in-label errors),
  // print/PDF include ONLY renderable ones + explicit skip summary.
  // WHY: never waste labels on error prints, never lose rows silently,
  // never block a 1000-label job for one typo. Block only if zero renderable.
  function lineOf(text) {
    var idx = rawValues().indexOf(text);
    return idx >= 0 ? idx + 1 : '?';
  }
  /**
   * Trial render offscreen to split renderable vs failing labels.
   * Covers EVERY conversion problem (EAN-13 letters, Code128 charset,
   * oversize QR, bwip limits) with one mechanism.
   */
  function classifyRenderable(list, o) {
    var good = [], bad = [];
    list.forEach(function (text) {
      var c = document.createElement('canvas'); // fresh: bwip may half-draw on failure
      try {
        QRStudioQR.renderToCanvas(c, text, { key: o.symKey, eclevel: o.eclevel, quiet: o.quiet, hd: false });
        good.push(text);
      } catch (err) {
        bad.push({ text: text, line: lineOf(text) });
      }
    });
    return { good: good, bad: bad };
  }
  function skipList(bad) {
    return bad.map(function (b) { return b.line; }).join(', ');
  }

  // ---------- Actions ----------
  function doPrint() {
    // Full print: temporarily render GOOD ONLY (chunked into real pages), print, restore preview window.
    var g = collectGeom(), o = collectOpts();
    if (!lastValid.length) renderAll(0);
    if (!lastValid.length) return;
    var cls = classifyRenderable(lastValid, o);
    if (!cls.good.length) {
      window.alert('Nothing valid to print: all ' + lastValid.length + ' labels fail as ' + o.symKey + '. Fix the data or switch symbology (QR Code handles URLs).');
      return;
    }
    if (cls.bad.length) {
      var ok = window.confirm('Print ' + cls.good.length + '/' + lastValid.length + ' labels as ' + o.symKey + '? Skipped lines: ' + skipList(cls.bad) + '. Cancel to fix the data first.');
      if (!ok) return;
    }
    var mount = $('preview'), keepPage = previewPage;
    var pages = QRStudioLayout.paginate(g, cls.good); // GOOD ONLY, real pagination
    renderPages(mount, pages, g, o);
    var _v = $('template') ? $('template').value : '';
    var _tk = (_v.indexOf('user:') === 0 || !QRStudioLayout.TEMPLATES[_v]) ? null : _v;
    QRStudioPrint.updatePageStyle(QRStudioLayout.pageSizeFor(g, _tk));
    setTimeout(function () {
      QRStudioPrint.doPrint();
      setTimeout(function () { renderAll(keepPage); }, 500); // restore virtualized preview after dialog
    }, 60);
  }
  function downloadPDF() {
    if (!lastValid.length) renderAll(0);
    if (!lastValid.length) return;
    var o = collectOpts();
    var cls = classifyRenderable(lastValid, o);
    if (!cls.good.length) {
      window.alert('Nothing valid to export: all ' + lastValid.length + ' labels fail as ' + o.symKey + '. Fix the data or switch symbology (QR Code handles URLs).');
      return;
    }
    if (cls.bad.length) {
      var ok = window.confirm('Export ' + cls.good.length + '/' + lastValid.length + ' labels to PDF? Skipped lines: ' + skipList(cls.bad) + '. Cancel to fix the data first.');
      if (!ok) return;
    }
    var vv = $('template') ? $('template').value : '';
    var ttk = (vv.indexOf('user:') === 0 || !QRStudioLayout.TEMPLATES[vv]) ? null : vv;
    var fname = $('pdfName') && $('pdfName').value ? $('pdfName').value : 'awizohub-labels';
    QRStudioPDF.downloadPDF(cls.good, collectGeom(), o, ttk, fname);
  }
  function clearData() { QRStudioStore.pushUndo($('dataInput').value); $('dataInput').value = ''; scheduleAutosave(); updateCount(0); $('preview').innerHTML = ''; }
  function undo() { var v = QRStudioStore.popUndo(); if (v !== undefined) { $('dataInput').value = v; scheduleAutosave(); updateCount(rawValues().length); renderAll(0); } }
  function generateDemo() {
    QRStudioStore.pushUndo($('dataInput').value);
    $('dataInput').value = Array.from({ length: 12 }, function (_, i) { return 'https://awizohub.com/p/' + String(i + 1).padStart(3, '0'); }).join('\n');
    scheduleAutosave(); updateCount(12); renderAll(0);
  }
  function applyZoom() {
    // Isolated: CSS zoom on wrapper only — never touches mm sizes or @page.
    $('previewZoom').style.zoom = (($('zoom').value || 70) / 100);
  }
  function renderCalibration() {
    QRStudioPrint.updatePageStyle('210mm 297mm');
    QRStudioPrint.renderCalibrationPage($('preview'));
    $('previewMeta').textContent = 'Calibration page — print it and measure the 100mm ruler.';
  }

  // ---------- Logo ----------
  function handleLogo(e) {
    var f = e.target.files[0]; if (!f) return;
    var prev = $('preview')._logoURL;
    if (prev) { try { URL.revokeObjectURL(prev); } catch (err) {} }
    var url = URL.createObjectURL(f);
    $('preview')._logoURL = url;
    $('preview')._logoName = f.name;
    updateLogoUI();
    renderAll(previewPage);
  }
  function removeLogo() {
    var prev = $('preview')._logoURL;
    if (prev) { try { URL.revokeObjectURL(prev); } catch (err) {} }
    $('preview')._logoURL = null;
    $('preview')._logoName = null;
    var inp = $('logoFile'); if (inp) inp.value = ''; // reset so same file can be re-picked
    updateLogoUI();
    renderAll(previewPage);
  }
  function updateLogoUI() {
    var has = !!$('preview')._logoURL;
    var btn = $('logoRemove'); if (btn) btn.style.display = has ? '' : 'none';
    var info = $('logoInfo'); if (info) info.textContent = has ? 'Logo: ' + ($('preview')._logoName || 'custom') : '';
  }

  // ---------- Autosave ----------
  var saveT = null;
  function scheduleAutosave() {
    $('autosaveInfo').textContent = 'saving…';
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      QRStudioStore.autosave({
        data: $('dataInput').value, geom: collectGeom(), opts: collectOpts(),
        template: $('template').value, pdfName: $('pdfName') ? $('pdfName').value : ''
      });
      $('autosaveInfo').textContent = 'autosaved ✓ ' + new Date().toLocaleTimeString();
    }, 600);
  }
  function restoreAutosave() {
    applyingTemplate = true;
    try {
    var s = QRStudioStore.loadAutosave();
    if (!s || !s.data) return false;
    $('dataInput').value = s.data;
    if (s.geom) {
      ['W', 'H', 'gapX', 'gapY', 'cols', 'rows', 'marginL', 'marginT', 'offX', 'offY'].forEach(function (k) {
        var map = { W: 'labelW', H: 'labelH', gapX: 'gapX', gapY: 'gapY', cols: 'cols', rows: 'rows', marginL: 'marginL', marginT: 'marginT', offX: 'offX', offY: 'offY' };
        if (s.geom[k] != null && $(map[k])) $(map[k]).value = s.geom[k];
      });
      if (s.geom.mode) $('mode').value = s.geom.mode;
      if (s.geom.radius != null && $('radius')) $('radius').value = s.geom.radius;
      if (s.geom.sensorGap != null && $('sensorGap')) $('sensorGap').value = s.geom.sensorGap;
    }
    if (s.opts) {
      if (s.opts.symKey) $('symbology').value = s.opts.symKey;
      if (s.opts.eclevel) $('eclevel').value = s.opts.eclevel;
      if (s.opts.quiet != null && $('quiet')) $('quiet').value = s.opts.quiet;
      if (s.opts.fontPt != null && $('fontPt')) $('fontPt').value = s.opts.fontPt;
      $('showText').checked = s.opts.showText !== false;
    }
    if (s.pdfName && $('pdfName')) $('pdfName').value = s.pdfName;
    return true;
    } finally { applyingTemplate = false; }
  }

  // ---------- Wire ----------
  function checkCDN() {
    var warn = $('cdnWarn');
    if (!warn) return;
    var missing = [];
    try { if (typeof bwipjs === 'undefined') missing.push('bwip-js (QR engine)'); } catch (e) { missing.push('bwip-js (QR engine)'); }
    if (!window.jspdf || !window.jspdf.jsPDF) missing.push('jsPDF (PDF export)');
    if (missing.length) {
      warn.style.display = '';
      warn.innerHTML = '⚠ Offline/CDN blocked: missing <b>' + missing.join(' + ') + '</b>. Preview may fail; use Print → Save as PDF, or run <b>npm run vendor</b> and swap to <b>vendor/*.js</b> (see vendor/README.md).';
    } else { warn.style.display = 'none'; }
  }
  function init() {
    // symbology options from registry (extensible)
    var sym = $('symbology'); sym.innerHTML = '';
    Object.keys(QRStudioQR.SYMBOLOGIES).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = QRStudioQR.SYMBOLOGIES[k].label;
      if (k === 'qrcode') o.selected = true;
      sym.appendChild(o);
    });
    refreshTemplateSelect();
    var saved = QRStudioStore.loadAutosave();
    if (saved && saved.template && ($('template').querySelector('option[value="' + saved.template + '"]') || saved.template.indexOf('user:') === 0)) {
      // Restore saved template selection FIRST, then geometry — never applyTemplate over it.
      try { $('template').value = saved.template; } catch (e) {}
      refreshTemplateSelect();
      try { $('template').value = saved.template; } catch (e2) {}
      restoreAutosave();
    } else if (saved && saved.data) {
      restoreAutosave(); // old autosave without template: keep numbers as saved
    } else {
      applyTemplate();
    }
    updateCount(rawValues().length);
    applyZoom();
    updateLogoUI();
    checkCDN();
    $('template').addEventListener('change', function () { applyTemplate(); scheduleAutosave(); });
    $('csvFile').addEventListener('change', handleCSV);
    if ($('logoFile')) $('logoFile').addEventListener('change', handleLogo);
    $('dataInput').addEventListener('input', function () { updateCount(rawValues().length); scheduleAutosave(); });
    $('zoom').addEventListener('input', applyZoom);
    GEOM_CORE.forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('input', function () { maybeMarkCustom(); scheduleAutosave(); });
    });
    ['offX', 'offY', 'radius', 'sensorGap', 'symbology', 'eclevel', 'quiet', 'fontPt', 'showText'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('input', scheduleAutosave);
    });
    // expose for inline onclick (file:// safe)
    window.renderAll = renderAll; window.doPrint = doPrint; window.downloadPDF = downloadPDF;
    window.clearData = clearData; window.undoEdit = undo; window.generateDemo = generateDemo;
    window.applyTemplate = applyTemplate; window.renderCalibration = renderCalibration;
    window.removeLogo = removeLogo;
    window.saveUserTpl = function () {
      var n = ($('tplName').value || '').trim(); if (!n) return alert('Name the template first.');
      QRStudioStore.saveUserTemplate(n, Object.assign(collectGeom(), { labelW: collectGeom().W, labelH: collectGeom().H }));
      refreshTemplateSelect(); $('template').value = 'user:' + n;
      alert('Saved "' + n + '" ✓');
    };
    window.exportTpls = function () {
      var blob = new Blob([QRStudioStore.exportTemplates()], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qr-templates.json'; a.click();
    };
    window.deleteUserTpl = function () {
      var v = $('template').value; if (v.indexOf('user:') !== 0) return alert('Select a ★ user template to delete.');
      QRStudioStore.deleteUserTemplate(v.slice(5)); refreshTemplateSelect();
    };
    window.togglePanel = function () { document.body.classList.toggle('panel-collapsed'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
