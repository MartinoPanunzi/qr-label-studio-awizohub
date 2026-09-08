/* global window, document */
/**
 * @file print.js
 * @page injection + calibration page. Draft borders live ONLY on screen
 * (@media print strips them) so preview guides never pollute the label.
 */
(function () {
  'use strict';

  /**
   * Set Chrome @page to exact mm size.
   * MUST be called before window.print(). Zoom slider uses CSS `zoom`
   * on a wrapper div, which never touches @page → zoom can't break print.
   * @param {string} size e.g. "210mm 297mm" or "54mm auto"
   */
  function updatePageStyle(size) {
    var el = document.getElementById('page-style');
    if (el) el.textContent = '@page { size: ' + size + '; margin: 0; }';
  }

  function doPrint() { window.print(); }

  /**
   * Render a calibration page: crosshairs every 10mm + 100mm ruler + corner marks.
   * HOW TO USE: Print it, measure with ruler. If 100mm prints as 99mm → Chrome
   * Scale is not 100%. If shifted +1mm right → set Calib X = -1.
   * @param {HTMLElement} mount
   */
  function renderCalibrationPage(mount) {
    mount.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'page calib';
    page.style.width = '210mm'; page.style.minHeight = '297mm'; page.style.padding = '10mm';
    var h = document.createElement('div');
    h.innerHTML = '<b>Calibration page</b> — 100mm ruler below must measure exactly 100mm. ' +
      'If not: Chrome dialog → Scale 100%, Margins None.';
    page.appendChild(h);
    var ruler = document.createElement('div');
    ruler.style.cssText = 'width:100mm;height:6mm;margin:6mm 0;border:1px solid #000;position:relative;';
    ruler.innerHTML = '<div style="position:absolute;left:0;top:0;bottom:0;width:50mm;border-right:1px solid #000"></div>';
    page.appendChild(ruler);
    var grid = document.createElement('div');
    grid.style.cssText = 'font-family:monospace;font-size:8pt;color:#475569';
    grid.textContent = '+ marks every 10mm — measure offset to set Calib X/Y.';
    page.appendChild(grid);
    mount.appendChild(page);
  }

  window.QRStudioPrint = { updatePageStyle: updatePageStyle, doPrint: doPrint, renderCalibrationPage: renderCalibrationPage };
})();
