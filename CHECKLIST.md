# QR Label Studio – Awizohub — Production-Ready Checklist

> Stato: tutto il codice FATTO. Resta solo verifica fisica del cliente (sez. 7 + righello/scan/Win-Mac/video).
> Dettaglio cosa/perché/come: `docs/IMPLEMENTATION.md`. Guida stampa: `docs/PRINT_GUIDE.md`.

## 1. Funzionalità core
- [x] CSV robusto (`js/csv.js`: BOM, `, ; tab |`, quotes, header skip, colonna, errori riga) 
- [x] Validazione dati (`js/validate.js`: vuoti/duplicati/capacità QR/charset Code128)
- [x] Libreria template (`js/store.js`: Save ★ localStorage + export/import JSON)
- [x] Custom completo (W/H/gap/margini + radius, fontPt, logo, quiet regolabile)
- [x] Sheet vs Roll reale (`js/layout.js`: striscia continua + sensorGap termico)

## 2. Print accuracy (codice fatto; misura fisica al cliente)
- [ ] Test righello reale su laser+inkjet+termica 203dpi — CLIENTE (stampare Calibration page, misurare 100mm, tarare CalX/Y)
- [x] Dialog Chrome blindato (`docs/PRINT_GUIDE.md`: None/100%/Background + tabella fix)
- [x] PDF alta risoluzione (`js/pdf.js`: scale ≥12, stesse mm di preview, Courier, no cut-line su roll)
- [x] Quiet zone + EC garantiti (`js/qr.js`: floor EC-M, padding ≥2, dpiScale per QR densi)
- [x] Bozza vs finale (`@media print` toglie tratteggi + `renderCalibrationPage` con righello 100mm)

## 3. Compatibilità Chrome Win / macOS
- [ ] Test incrociato stesso CSV Win+Mac — CLIENTE (codice reso deterministico: stessi mm/font/PDF)
- [x] Font embedding (solo monospace sistema; niente webfont)
- [x] Zoom schermo ≠ stampa (CSS `zoom` su wrapper, mai su mm/@page)

## 4. UI responsive + UX
- [x] Mobile/tablet (collassabile <900px, sticky actions)
- [x] Performance (`PREVIEW_LIMIT` 200 + pager; print/PDF usano tutti i dati)
- [x] Undo + autosave (localStorage debounced + stack 30 + indicatore)
- [x] UI in inglese pulito, errori in inglese

## 5. Codebase pulita + estendibilità
- [x] Split moduli (`js/csv|validate|qr|layout|store|print|pdf|main` con JSDoc)
- [x] Symbology plugin (`SYMBOLOGIES` registry + 6 formati + doc 3-righe)
- [x] Vendor offline (`vendor/download-vendor.ps1` + `vendor/README.md` + fallback alert)
- [x] `package.json`, `.eslintrc.json`, `CHANGELOG.md`

## 6. Deploy + handover
- [x] `vercel.json` + `netlify.toml` (statico 1-click)
- [x] README consegna (run/deploy/template/laser-vs-termica/FAQ/simbologie)
- [ ] Video 2 min — DA REGISTRARE seguendo `docs/VIDEO_SCRIPT.md` (OBS/Loom 1080p)

## 7. Test finali di accettazione — CLIENTE
- [ ] Test 1 – Fedeltà 3 formati: stampa + calibro, tolleranza ±0.5mm
- [ ] Test 2 – Scan random: 10 QR al primo colpo con Android + iPhone
- [ ] Test 3 – Win/Mac: stesso CSV → stesso output visivo
