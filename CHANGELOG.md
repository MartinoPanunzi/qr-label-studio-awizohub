# Changelog

## 1.0.0 — production-ready (except physical client tests)
- Robust CSV: BOM, separators , ; tab |, quotes, header skip, column picker, per-line errors
- Validation: empty/duplicates/QR capacity/Code128 charset with clear messages
- Template library: save ★ in localStorage + export/import JSON
- Custom complete: radius, font pt, logo, quiet zone, thermal sensor gap
- Sheet vs Roll: roll = continuous strip, gap sensor support
- Print: dynamic @page mm, draft borders screen-only, calibration page with 100mm ruler
- PDF: HD scale ≥12, same mm coords as screen/print, Courier for Win/Mac identity
- Compat: system monospace only, zoom isolated via CSS zoom wrapper
- UX: responsive + collapsible panel, preview virtualized 200/page + pager, autosave + undo
- Code: split js/csv,validate,qr,layout,store,print,pdf,main with JSDoc; symbology registry (qrcode/code128/datamatrix/ean13/pdf417/aztec)
- Deploy: vercel.json + netlify.toml + vendor script + docs

## 1.1.0 — hybrid print gate + error UX
- Validation: symbology failures aggregated in one box (anti-spam); EAN-13 not pre-filtered (in-label errors like Aztec)
- Render: visible in-label encode error instead of silent red border
- Print/PDF: hybrid gate — preview shows all, export includes only renderable + skip summary (lines), block only if zero valid
- Layout: sheet @page always A4 (fixed single-column collapse), overflow warning with 1mm tolerance, Avery marginL 7
- UI: logo removable (X button), file-input sizing fixes

## 1.2.0 — print guide in-browser
- Full print guide embedded in index.html (#print-guide): steps, laser vs thermal, symptom table
- Header Guide button with anchor + :target highlight; panel auto-expands on mobile
