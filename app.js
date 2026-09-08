/**
 * DEPRECATED — kept for reference only, NOT loaded by index.html.
 * Active code is js/csv|validate|qr|layout|store|print|pdf|main.js.
 * Do not edit here; edit js/* instead.
 *
 * Awizohub QR Label Studio — Demo (legacy single-file)
 * --------------------------------
 * Clean, dependency-light logic:
 *  - Data in  -> labels out (sheet or roll)
 *  - All geometry in MILLIMETERS (print-accurate in Chrome)
 *  - Symbology via bwip-js -> extend by adding bcid here (see SYMBOLOGIES)
 *  - PDF via jsPDF uses SAME mm coordinates as screen/print
 */

// Predefined templates (client test: at least 3 sizes)
const TEMPLATES = {
  avery7160:  { labelW: 63.5, labelH: 38.1, gapX: 2.5, gapY: 0, cols: 3, rows: 7, marginL: 7.5, marginT: 13, pageW: 210, pageH: 297, mode: 'sheet' },
  dymo30334:  { labelW: 50,   labelH: 30,   gapX: 0,   gapY: 2, cols: 1, rows: 20, marginL: 2,  marginT: 2,  pageW: 54,  pageH: 0,   mode: 'roll'  },
  ship4x6:    { labelW: 102,  labelH: 152,  gapX: 0,   gapY: 0, cols: 1, rows: 1,  marginL: 0,  marginT: 0,  pageW: 102, pageH: 152, mode: 'sheet' },
  mini40x30:  { labelW: 40,   labelH: 30,   gapX: 3,   gapY: 3, cols: 4, rows: 8,  marginL: 9,  marginT: 13, pageW: 210, pageH: 297, mode: 'sheet' },
};

// Extensible symbologies: bwip-js bcid names. Add e.g. 'ean13','pdf417' later.
const SYMBOLOGIES = { qrcode: 'qrcode', code128: 'code128', datamatrix: 'datamatrix' };

const $ = (id) => document.getElementById(id);

$('template').addEventListener('change', applyTemplate);
$('csvFile').addEventListener('change', handleCSV);
$('dataInput').addEventListener('input', updateCount);
$('zoom').addEventListener('input', applyZoom);

function applyTemplate() {
  const t = TEMPLATES[$('template').value];
  if (!t) return; // custom: keep manual values
  $('labelW').value = t.labelW; $('labelH').value = t.labelH;
  $('gapX').value = t.gapX;     $('gapY').value = t.gapY;
  $('cols').value = t.cols;     $('rows').value = t.rows;
  $('marginL').value = t.marginL; $('marginT').value = t.marginT;
  $('mode').value = t.mode;
}

function applyZoom() {
  $('previewZoom').style.zoom = ($('zoom').value / 100);
}

function updateCount() {
  const n = parseData().length;
  $('count').textContent = n + ' label' + (n === 1 ? '' : 's');
}

// Accept textarea (one per line) + CSV (first column or whole line)
function parseData() {
  return $('dataInput').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function handleCSV(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const lines = String(r.result).split(/\r?\n/).map(l => l.split(',')[0].trim()).filter(Boolean);
    const cur = $('dataInput').value.trim();
    $('dataInput').value = (cur ? cur + '\n' : '') + lines.join('\n');
    updateCount(); renderAll();
  };
  r.readAsText(f);
}

function clearData() { $('dataInput').value = ''; updateCount(); $('preview').innerHTML = ''; }
function generateDemo() {
  $('dataInput').value = Array.from({ length: 12 }, (_, i) =>
    `https://awizohub.com/p/${String(i + 1).padStart(3, '0')}`).join('\n');
  updateCount(); renderAll();
}

function geom() {
  return {
    W: +$('labelW').value, H: +$('labelH').value,
    gapX: +$('gapX').value, gapY: +$('gapY').value,
    cols: +$('cols').value, rows: +$('rows').value,
    marginL: +$('marginL').value, marginT: +$('marginT').value,
    offX: +$('offX').value, offY: +$('offY').value,
    mode: $('mode').value,
    bcid: SYMBOLOGIES[$('symbology').value],
    eclevel: $('eclevel').value, showText: $('showText').checked,
  };
}

// ---- Main render: builds pages of labels with real mm sizes ----
async function renderAll() {
  const g = geom();
  const data = parseData();
  if (!data.length) { $('previewMeta').textContent = 'Paste at least 1 line of data first.'; return; }

  const preview = $('preview');
  preview.innerHTML = '';
  const perPage = g.mode === 'roll' ? data.length : g.cols * g.rows;
  const pages = Math.ceil(data.length / perPage);

  // Dynamic @page size for Chrome print dialog
  const pageStyle = $('page-style');
  if (g.mode === 'roll') {
    const rollW = g.W + g.marginL * 2;
    pageStyle.textContent = `@page { size: ${rollW}mm auto; margin: 0; }`;
    $('previewMeta').textContent = `${data.length} labels — ROLL ${g.W}×${g.H}mm — @page ${rollW}mm continuous`;
  } else {
    const isA4 = (g.cols * g.W < 150); // heuristic: small labels -> A4 sheet
    const pW = TEMPLATES[$('template').value]?.pageW || (isA4 ? 210 : g.W);
    const pH = TEMPLATES[$('template').value]?.pageH || (isA4 ? 297 : g.H);
    pageStyle.textContent = `@page { size: ${pW}mm ${pH}mm; margin: 0; }`;
    $('previewMeta').textContent = `${data.length} labels — ${pages} page(s) — SHEET ${g.W}×${g.H}mm ${g.cols}×${g.rows}`;
  }

  for (let p = 0; p < pages; p++) {
    const chunk = data.slice(p * perPage, (p + 1) * perPage);
    const page = document.createElement('div');
    page.className = 'page';
    if (g.mode === 'roll') {
      page.style.width = (g.W + g.marginL * 2) + 'mm';
      page.style.padding = g.marginT + 'mm ' + g.marginL + 'mm';
      page.style.flexDirection = 'column'; page.style.alignItems = 'center';
    } else {
      const t = TEMPLATES[$('template').value];
      const pW = t?.pageW || 210, pH = t?.pageH || 297;
      page.style.width = pW + 'mm';
      page.style.minHeight = (pH ? pH + 'mm' : 'auto');
      page.style.padding = `calc(${g.marginT + g.offY}mm) 0 0 calc(${g.marginL + g.offX}mm)`;
      page.style.gap = `${g.gapY}mm ${g.gapX}mm`;
    }

    for (const text of chunk) {
      const lab = document.createElement('div');
      lab.className = 'label';
      lab.style.width = g.W + 'mm'; lab.style.height = g.H + 'mm';
      if (g.mode === 'roll') lab.style.marginBottom = g.gapY + 'mm';
      const cv = document.createElement('canvas');
      lab.appendChild(cv);
      if (g.showText) {
        const d = document.createElement('div');
        d.className = 'txt'; d.textContent = text.length > 42 ? text.slice(0, 42) + '…' : text;
        lab.appendChild(d);
      }
      page.appendChild(lab);
      try {
        // scale 8 = high-res so thermal/laser stays sharp; padding = quiet zone
        const opts = g.bcid === 'qrcode'
          ? { bcid: g.bcid, text, scale: 8, eclevel: g.eclevel, includetext: false, padding: 2 }
          : { bcid: g.bcid, text, scale: 4, includetext: false, padding: 2 };
        bwipjs.toCanvas(cv, opts);
      } catch (err) {
        lab.style.borderColor = 'red';
        lab.title = 'Encode error: ' + err;
      }
    }
    preview.appendChild(page);
  }
  applyZoom();
}

function doPrint() {
  if (!$('preview').children.length) renderAll();
  window.print(); // Chrome dialog: Margins=None, Scale=100%, Background graphics=ON
}

// ---- PDF export with identical mm geometry ----
async function downloadPDF() {
  const g = geom();
  const data = parseData();
  if (!data.length) return alert('Add data first.');
  const { jsPDF } = window.jspdf;
  let doc;
  if (g.mode === 'roll') {
    const rollW = g.W + g.marginL * 2;
    const rollH = data.length * (g.H + g.gapY) + g.marginT * 2;
    doc = new jsPDF({ unit: 'mm', format: [rollW, rollH] });
  } else {
    const t = TEMPLATES[$('template').value];
    doc = new jsPDF({ unit: 'mm', format: (t?.pageW === 210 ? 'a4' : [t?.pageW || 210, t?.pageH || 297]) });
  }
  const perPage = g.mode === 'roll' ? data.length : g.cols * g.rows;
  for (let i = 0; i < data.length; i++) {
    const pageIdx = Math.floor(i / perPage), idx = i % perPage;
    if (g.mode !== 'roll' && i > 0 && idx === 0) doc.addPage();
    const col = idx % g.cols, row = Math.floor(idx / g.cols);
    let x, y;
    if (g.mode === 'roll') { x = g.marginL; y = g.marginT + i * (g.H + g.gapY); }
    else { x = g.marginL + g.offX + col * (g.W + g.gapX); y = g.marginT + g.offY + row * (g.H + g.gapY); }
    // render QR offscreen then embed as image at exact mm box
    const cv = document.createElement('canvas');
    const opts = g.bcid === 'qrcode'
      ? { bcid: g.bcid, text: data[i], scale: 8, eclevel: g.eclevel, padding: 2 }
      : { bcid: g.bcid, text: data[i], scale: 4, padding: 2 };
    bwipjs.toCanvas(cv, opts);
    const img = cv.toDataURL('image/png');
    const pad = 2, maxBox = Math.min(g.W, g.H) - pad * 2;
    doc.addImage(img, 'PNG', x + pad, y + pad * 0.5, maxBox, maxBox * 0.72);
    if (g.showText) { doc.setFontSize(7); doc.text(String(data[i]).slice(0, 40), x + g.W / 2, y + g.H - 2, { align: 'center' }); }
    // No border rect: must match print (no borders)
  }
  var _n = (document.getElementById('pdfName') && document.getElementById('pdfName').value || 'awizohub-labels').trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\.pdf$/i, '').slice(0,120) || 'awizohub-labels';
  doc.save(_n + '.pdf');
}

// init
applyTemplate(); updateCount(); applyZoom();
