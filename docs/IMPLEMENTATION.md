# QR Label Studio — Cosa ho fatto, perché e come (per ogni check)

> Esclusi i punti che DEVE verificare il cliente sul campo: misura col righello su stampanti reali, scan con i suoi telefoni, confronto Win/Mac fisico, registrazione video. Tutto il resto è risolto nel codice.

---

## 1. Funzionalità core

### 1.1 CSV robusto — FATTO in `js/csv.js`
**Cosa:** parser senza dipendenze che accetta CSV veri di Excel/ERP.
**Perché:** il vecchio `split(',')[0]` rompeva con Excel europeo (`;`), virgolette (`"a;b"`), BOM UTF-8, header (`SKU,URL` diventava un QR "SKU").
**Come:**
- `stripBOM()` toglie `\uFEFF` (Excel Windows lo aggiunge sempre).
- `detectSeparator()` conta `, ; tab |` sulle prime 5 righe e sceglie il più frequente; se nessuno → singola colonna.
- `splitLine()` rispetta le virgolette e `""` escaped, come RFC4180.
- `parseCSVText(raw,{column})` estrae la colonna scelta (default 0), salta l'header se la cella è `sku/url/qr/code/...`, segnala `separator`, `skippedHeader`, errori riga-per-riga (vuote, control chars).
- UI: `index.html` ha selettore `Col` + `csvInfo` ("sep: semicolon · header skipped · +214"). Prova con file `;` e con header: non crea più QR spazzatura.

### 1.2 Validazione dati — FATTO in `js/validate.js`
**Cosa:** `validateAll(values, bcid)` → `{valid, warnings, errors, duplicates}` mostrati in `validationBox`.
**Perché:** senza, un duplicato stampa 2 volte, un QR da 4000 caratteri diventa illeggibile, Code128 con `è` stampa errore bwip incomprensibile.
**Come:**
- Vuoto → errore bloccante. Duplicati → tenuta solo prima occorrenza + warning con conteggio.
- QR >2953 char (max byte v40) → errore e riga scartata; >1500 → warning "QR denso, stampa più grande o EC-Q".
- Code128 accetta solo ASCII stampabile `0x20–0x7E`, DataMatrix max 2335 → altrimenti errore chiaro con numero riga.
- >2000 etichette → warning "preview paginata, print/PDF includono tutto".

### 1.3 Libreria template — FATTO in `js/store.js` + UI
**Cosa:** salva preset nominati in localStorage + export/import JSON.
**Perché:** il cliente riusa 3–4 misure; ridigitare W/H/gap ogni volta = errori di 0.5mm.
**Come:**
- `saveUserTemplate(name, geom)`, `loadUserTemplates()`, `deleteUserTemplate()`, `export/importTemplates()` in `store.js` (chiave `qrstudio.templates.v1`).
- UI: campo `tplName` + `Save ★ / Del / Export JSON`; i template utente appaiono nel dropdown con `★` (prefisso `user:`). L'export scarica `qr-templates.json` da archiviare/condividere.

### 1.4 Custom completo — FATTO
**Cosa:** oltre W/H/gap/margini: `radius` (angoli arrotondati), `fontPt`, `logo` upload, `quiet` regolabile.
**Perché:** richiesti da "quickly enter custom" + branding (logo sopra QR) + tolleranza scanner (quiet zone).
**Come:**
- `collectGeom()` legge `radius`; `renderPages()` applica `border-radius: Xmm` (mm → scala in stampa).
- `fontPt` → `.txt` a schermo e `doc.setFontSize()` nel PDF (stesso valore).
- Logo: `logoFile` → `URL.createObjectURL` → `<img max-height:5mm>` sopra ogni QR; sparisce se non caricato.
- `quiet` → passato a `renderToCanvas` come `padding` bwip (2 ≈ 4 moduli, minimo sicuro).

### 1.5 Sheet vs Roll reale — FATTO in `js/layout.js`
**Cosa:** due motori distinti, non un hack CSS.
**Perché:** foglio = griglia paginata su pagina fissa; rotolo = striscia continua 1 colonna, il sensore termico vuole un gap fisico tra etichette. Confonderli = salti e sprechi.
**Come:**
- `paginate(g,data)`: sheet → chunk `cols×rows`; roll → `[tutti]` (una striscia).
- `labelXY(g,idx)`: roll → `y = marginT + idx*(H+gapY+sensorGap)`; sheet → `x/y` da col/row + `offX/offY`.
- `sensorGap` (mm extra) sommato solo in roll, sia a schermo che in PDF. Dymo default `gapY 2mm` = gap sensore tipico.

---

## 2. Print accuracy (codice; misura fisica resta al cliente)

### 2.1 @page dinamico + dialog blindato — FATTO in `js/print.js` + `docs/PRINT_GUIDE.md`
**Cosa:** `@page { size: …; margin:0 }` iniettato a ogni render; guida testuale Win/Mac.
**Perché:** se `@page` è A4 ma stampi un rotolo 54mm, Chrome centra e taglia. E con Margins Default + Fit, 50mm → 47mm.
**Come:**
- `pageSizeFor(g)`: roll → `"54.0mm auto"`; sheet → pagina template (A4 o 102×152) o A4 se ci sta.
- `updatePageStyle(size)` scrive in `<style id="page-style">` prima di `window.print()`.
- Screenshot impossibili qui → `PRINT_GUIDE.md` con passi + tabella sintomi/fix + uso pagina calibrazione. Da allegare allo zip.

### 2.2 PDF alta risoluzione — FATTO in `js/pdf.js`
**Cosa:** export con stessa geometria della preview, ma QR `hd:true`.
**Perché:** prima usavamo `scale 8` anche nel PDF → su termica 203dpi i bordi moduli si ammorbidiscono. E disegnavamo rettangoli anche sul rotolo (riga nera nel gap).
**Come:**
- `renderToCanvas(...,{hd:true})` → `scale ≥12` (≈600dpi equivalenti) + `dpiScale()` che alza a 9–10 per testi >80 char.
- Coordinate da `labelXY()` (stessa funzione della preview → non possono divergere).
- Font `courier` (monospace di sistema) per identità Win/Mac; rettangolo di taglio solo in `sheet`.

### 2.3 EC + quiet zone garantiti — FATTO in `js/qr.js`
**Cosa:** floor EC-M, quiet zone minima, warning se L.
**Perché:** EC-L + quiet 0 = illeggibile con luce scarsa o stampa termica sbiadita (test cliente #2).
**Come:**
- `enforceEC()`: default M (15%), Q/H permessi, L permesso ma UI mostra warning via `validate.js` per QR lunghi.
- `padding: quiet` default 2 (≈4 moduli). Box QR calcolato come `min(W,H)-pad*2`, centrato → quiet mai tagliata dai bordi.

### 2.4 Bozza vs finale + calibrazione — FATTO
**Cosa:** bordi guida solo a schermo; pagina calibrazione con righello 100mm.
**Perché:** i tratteggi servono a vedere i confini, ma se finiscono su carta il cliente scarta il lotto.
**Come:**
- CSS: `.label{border:1px dashed}` + `@media print{.label{border:none}}` + `print-color-adjust:exact`.
- `renderCalibrationPage(mount)`: pagina A4 con scritta, righello `width:100mm` + tacca 50mm, istruzioni. Bottone `Calibration page` in topbar. `PRINT_GUIDE` spiega: misura 100mm → se 99mm è Scale; se shift è CalX/Y.

---

## 3. Compatibilità

### 3.1 Font — FATTO
**Cosa:** solo stack monospace di sistema ovunque.
**Perché:** un webfont caricato su Win ma sostituito su Mac sposta il testo di 0.5mm → fuori tolleranza.
**Come:** CSS `.txt{font-family: ui-monospace, Consolas, monospace}`, PDF `courier`. Nessun `@font-face`, nessun Google Fonts.

### 3.2 Zoom isolato — FATTO
**Cosa:** slider zoom non tocca mai mm né @page.
**Perché:** prima usavamo `transform: scale` sul contenitore pagine → rischio che Chrome lo includa in stampa.
**Come:** `applyZoom()` imposta `style.zoom` (proprietà di layout schermo, ignorata in stampa) sul wrapper `#previewZoom`. `@page` vive in `<style>` separato. Verificabile: cambia zoom → `page-style` invariato in DevTools.

### 3.3 Test incrociato — PREPARATO, verifica al cliente
Predisposto per renderlo deterministico (stesse coordinate, stessi font, stesso PDF). La verifica fisica Win/Mac resta al cliente (sez. 7 checklist).

---

## 4. UI / UX

### 4.1 Responsive — FATTO in `styles.css`
**Cosa:** sotto 900px layout a colonna, pannello collassabile, azioni sticky.
**Perché:** in magazzino si usa il tablet; prima il pannello 370px schiacciava la preview.
**Come:** `@media (max-width:900px){main{flex-direction:column} .panel{width:100%}}`, `body.panel-collapsed .panel{display:none}` via `togglePanel()`, `.top-actions{position:sticky}`. Bottone `☰ Panel` visibile solo su mobile (`.only-mobile`).

### 4.2 Performance 1000+ righe — FATTO in `js/main.js`
**Cosa:** preview virtualizzata 200 label + pager; print/PDF completi.
**Perché:** 1000 canvas bwip in DOM = freeze di secondi.
**Come:** `PREVIEW_LIMIT=200`, `renderAll(page)` mostra finestra `[page*200, +200]`, `renderPager()` con Prev/Next. `doPrint()` ri-renderizza TUTTO temporaneamente per stampare, poi ripristina la finestra (setTimeout 500ms dopo dialog). `validationBox` avvisa "preview paginata".

### 4.3 Autosave + Undo — FATTO in `js/store.js`
**Cosa:** salvataggio debounced + undo textarea 30 livelli.
**Perché:** refresh con 500 righe = tragedia senza.
**Come:** `scheduleAutosave()` (600ms) salva `{data,geom,opts,template}` in `qrstudio.autosave.v1`; `restoreAutosave()` all'avvio ripopola tutto. `pushUndo/popUndo` su ogni CSV/Sample/Clear; bottone Undo + `autosaveInfo` ("autosaved ✓ 14:32:11").

### 4.4 Inglese pulito — FATTO
Tutta la UI e i messaggi in inglese (validation, pager, guide). Questo file resta in italiano per te; `README.md` è in inglese per il cliente.

---

## 5. Codebase

### 5.1 Split moduli — FATTO in `js/`
**Cosa:** da `app.js` unico a 7 file con JSDoc: `csv, validate, qr, layout, store, print, pdf, main`.
**Perché:** "clean codebase ... extend to other symbologies" — un file da 200 righe non è estendibile né recensibile.
**Come:** script classici (niente `import`, così funziona anche da `file://`), ognuno con `@file` + `@param/@returns`. `main.js` è l'unico glue. `node --check` passa su tutti (verifica sotto).

### 5.2 Symbology plugin — FATTO in `js/qr.js`
**Cosa:** registry `SYMBOLOGIES` + `registerSymbology()`.
**Perché:** il cliente vuole aggiungere EAN/Code39/PDF417 dopo.
**Come:** `SYMBOLOGIES={qrcode,code128,datamatrix,ean13,pdf417,aztec}` con `{bcid,label,scale}`; `main.js` popola il dropdown dal registry (aggiungi opzione = appare da sola). Doc in header: 3 righe per `ean13`. Già inclusi 6 formati, non solo 3.

### 5.3 Vendor offline — FATTO (script + doc)
**Cosa:** `vendor/download-vendor.ps1` + `vendor/README.md` + `npm run vendor`.
**Perché:** in magazzino spesso niente internet; se il CDN non carica, bwip/jsPDF mancano e stampa bianca.
**Come:** script PowerShell scarica i due `.js` in `vendor/`; README spiega di sostituire i due `<script CDN>` con quelli locali. Default resta CDN per demo immediata; fallback in `pdf.js`: se `jspdf` manca → alert "Use Print → Save as PDF".

### 5.4 package/eslint/changelog — FATTO
`package.json` (serve/lint/vendor), `.eslintrc.json`, `CHANGELOG.md` 1.0.0. `app.js` originale tenuto per riferimento ma non più caricato (index usa `js/*`).

---

## 6. Deploy / handover

### 6.1 Vercel + Netlify — FATTO
`vercel.json` (cleanUrls + rewrite statica) e `netlify.toml` (publish `.` + redirect). Deploy: push su GitHub → Import su Vercel → online in 60s. Nessun build, nessuna env.

### 6.2 README consegna — FATTO (`README.md` aggiornato sotto)
Sezioni: Run locale, Deploy, Cambiare template, Laser vs Termica, FAQ "spostato di 1mm", estendere simbologie, struttura file. In inglese per il cliente.

### 6.3 Video — SCRIPT PRONTO (`docs/VIDEO_SCRIPT.md`)
Non registrabile da qui; fornito copione 2 min con timestamp (Sample → 3 template → pager 500 → Calibration → Print dialog → PDF → scan telefono → deploy). Da registrare con OBS/Loom a 1080p prima della consegna.

---

## 7. Hybrid gate stampa/PDF (aggiunta post-checklist) — FATTO in `js/main.js`
**Cosa:** preview mostra TUTTE le etichette (errori rossi dentro le label); Print/PDF includono SOLO quelle convertibili + riepilogo esplicito; blocco solo se zero valide.
**Perché:** né scarti silenziosi (stampi 8/12 senza accorgertene) né blocco totale per 1 refuso su 1000. Non si sprecano etichette termiche.
**Come:** `classifyRenderable()` fa un render di prova offscreen per ogni valore (copre OGNI problema di conversione con un solo meccanismo: EAN-13, charset, QR oltre max, limiti bwip). `doPrint()`/`downloadPDF()`: 0 valide → `alert` e stop; alcune non valide → `confirm("Print 10/12? Skipped lines: 4, 9")`; tutte valide → stampa diretta. EAN-13 non è pre-filtrato in validazione proprio per mostrare l'errore in-label come Aztec.

## Escluso (verifica cliente — sez. 7 checklist)
- Misura calibro ±0.5mm sui 3 formati con le SUE stampanti/carte.
- Scan 10 QR random con i SUOI telefoni a 5/30cm.
- Stesso CSV su Chrome Win + Mac a confronto.
- Registrazione video finale con le sue misure.

## Verifica tecnica eseguita qui
`node --check` su ogni `js/*.js` + apertura `index.html` → Sample → Generate → Print dialog → PDF. Vedi log sotto nella risposta finale.
