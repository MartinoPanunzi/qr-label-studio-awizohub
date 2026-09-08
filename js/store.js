/* global window, localStorage */
/**
 * @file store.js
 * Template library (localStorage + JSON import/export) + autosave + undo.
 * WHY: client wants to reuse sizes without retyping; autosave prevents losing 1000-row work on refresh.
 */
(function () {
  'use strict';
  var LS_TPL = 'qrstudio.templates.v1';
  var LS_AUTO = 'qrstudio.autosave.v1';
  var undoStack = [];

  function loadUserTemplates() {
    try { return JSON.parse(localStorage.getItem(LS_TPL) || '{}'); } catch (e) { return {}; }
  }
  function saveUserTemplate(name, geom) {
    var all = loadUserTemplates(); all[name] = geom;
    localStorage.setItem(LS_TPL, JSON.stringify(all));
  }
  function deleteUserTemplate(name) {
    var all = loadUserTemplates(); delete all[name];
    localStorage.setItem(LS_TPL, JSON.stringify(all));
  }
  function exportTemplates() { return JSON.stringify(loadUserTemplates(), null, 2); }
  function importTemplates(json) {
    var obj = JSON.parse(json), all = loadUserTemplates();
    for (var k in obj) all[k] = obj[k];
    localStorage.setItem(LS_TPL, JSON.stringify(all));
    return Object.keys(obj).length;
  }

  /** Autosave data+settings (debounced by caller). */
  function autosave(state) {
    try { localStorage.setItem(LS_AUTO, JSON.stringify({ t: Date.now(), state: state })); } catch (e) {}
  }
  function loadAutosave() {
    try { var o = JSON.parse(localStorage.getItem(LS_AUTO) || 'null'); return o && o.state; } catch (e) { return null; }
  }
  /** Undo: push previous textarea value (cap 30). */
  function pushUndo(v) { undoStack.push(v); if (undoStack.length > 30) undoStack.shift(); }
  function popUndo() { return undoStack.pop(); }

  window.QRStudioStore = {
    loadUserTemplates: loadUserTemplates, saveUserTemplate: saveUserTemplate,
    deleteUserTemplate: deleteUserTemplate, exportTemplates: exportTemplates,
    importTemplates: importTemplates, autosave: autosave, loadAutosave: loadAutosave,
    pushUndo: pushUndo, popUndo: popUndo
  };
})();
