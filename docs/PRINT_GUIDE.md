# Guida stampa Chrome — mm accuracy (Windows + macOS)

> Leggila prima di stampare, altrimenti le etichette escono spostate e sembra un bug (non lo è).

## 1. Impostazioni obbligatorie nel dialog di stampa
1. `Generate preview` nell'app.
2. `Print` → nel dialog Chrome imposta:
   - **Destination:** la tua stampante (o Save as PDF per test)
   - **Margins:** **None** (Nessuno)
   - **Scale:** **100%** (mai "Fit to page" / "Adatta")
   - **☑ Background graphics** (Grafica di sfondo) ON
   - **Paper size:** A4 per Avery/Mini; per Dymo 50×30 imposta carta 54mm o rotolo 50mm; per 4×6" imposta 102×152mm.
3. Stampa.

Perché: Chrome di default scala e aggiunge margini → 50mm diventano 47mm. Solo con None+100% i mm CSS = mm reali.

## 2. Prima stampa: pagina di calibrazione
1. Clicca **Calibration page** → **Print**.
2. Misura il righello da 100mm con un righello vero:
   - Misura 99mm? → Scale non è 100%.
   - Perfetto 100mm ma tutto spostato +1mm a destra? → metti **CalX = -1** e ristampa.
   - Termica che salta etichette? → aumenta **SensGap** di 1–2mm (gap fisico del sensore).

## 3. Laser vs Inkjet vs Termica
- **Laser/Inkjet foglio A4:** carta A4 nel vassoio, Templates Avery/Mini. I bordi tratteggiati li vedi solo a schermo, mai su carta.
- **Termica rotolo:** Template Dymo, Mode Roll, carta = larghezza rotolo. Se stampa a metà tra due etichette → SensGap.
- **PDF:** `⬇ PDF` usa le stesse coordinate della preview. Aprilo, stampa da Acrobat con "Actual size".

## 4. Errori tipici
| Sintomo | Causa | Fix |
|---|---|---|
| Tutto rimpicciolito | Scale Fit | Scale 100% |
| Bordo bianco, etichette spostate | Margins Default | Margins None |
| QR sbiadito | Background OFF / inkjet bozza | Background ON, qualità Alta |
| Salta un'etichetta sì e una no | SensGap 0 su termica | SensGap 2mm |
