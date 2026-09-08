# Awizohub — QR Label Studio (Production-ready, v1.0.0)

Web tool to generate + print QR-code stickers. Open in **Google Chrome** — no backend.

## Run locally
Double-click `index.html`, or:
```
npx serve .
# or: npm run serve
```

## Deploy (1-click, static)
- **Vercel:** push to GitHub → Import → Deploy (see `vercel.json`). Online in ~60s.
- **Netlify:** drop folder or connect repo (see `netlify.toml`).
- **Offline warehouse:** run `npm run vendor`, then swap the 2 CDN scripts for `vendor/*.js` (see `vendor/README.md`).

## Use
1. Paste lines or **📁 CSV** (separators `, ; tab |` auto-detected, header skipped, pick column via `Col`). Sample: `exemple.csv`.
2. Pick template (Avery 63.5×38.1 / Dymo 50×30 roll / 102×152 4×6 / Mini) or Custom + Save ★. Export/import JSON to share.
3. Tune W/H/gap/margins + CalX/CalY + Radius + SensGap (thermal) + Quiet + Font + Logo.
4. **Generate preview** → check `validationBox` (duplicates, long QR, charset).
5. **Calibration page** first → Print → measure 100mm ruler (see `docs/PRINT_GUIDE.md`).
6. **Print** (Margins None, Scale 100%, Background ON) or **⬇ PDF**.

## Laser vs Thermal
- Laser/Inkjet A4: Avery/Mini, paper A4.
- Thermal roll: Dymo, Mode Roll, paper = roll width, SensGap 2mm if skipping.
- Dashed borders are screen-only, never printed.

## FAQ — "shifted by 1mm"
Set CalX/CalY ∓1 and reprint. If 100mm ruler ≠ 100mm → Scale is not 100%.

## Add a symbology (3 lines)
In `js/qr.js`:
```js
QRStudioQR.registerSymbology('ean13', { bcid:'ean13', label:'EAN-13', scale:4 });
```
Add `<option value="ean13">` (auto-listed if added before init) — render + PDF follow automatically. Built-in: qrcode, code128, datamatrix, ean13, pdf417, aztec.

## Files
`index.html, styles.css, js/csv|validate|qr|layout|store|print|pdf|main.js, docs/PRINT_GUIDE|IMPLEMENTATION|VIDEO_SCRIPT.md, exemple.csv, vercel.json, netlify.toml`
