var SUMMARY_SHEET_NAME = 'Auditorias';
var ITEMS_SHEET_NAME = 'AuditoriaItems';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'audit-sync', version: '1.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents || '{}');
    validatePayload_(payload);

    var spreadsheet = getSpreadsheet_();
    var summarySheet = getOrCreateSheet_(spreadsheet, SUMMARY_SHEET_NAME, [
      'auditId',
      'submittedAt',
      'auditDate',
      'location',
      'auditorId',
      'auditorName',
      'role',
      'staffName',
      'totalScore',
      'passCount',
      'failCount',
      'naCount',
      'answeredCount',
      'itemsCount',
      'notes',
      'submittedByEmail'
    ]);
    var itemsSheet = getOrCreateSheet_(spreadsheet, ITEMS_SHEET_NAME, [
      'auditId',
      'submittedAt',
      'auditDate',
      'location',
      'auditorName',
      'role',
      'staffName',
      'questionIndex',
      'question',
      'status',
      'statusLabel',
      'comment'
    ]);

    appendSummaryRow_(summarySheet, payload.sheet.summaryRow);
    appendItemRows_(itemsSheet, payload.sheet.itemRows || []);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, auditId: payload.audit.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function appendSummaryRow_(sheet, row) {
  sheet.appendRow([
    row.auditId || '',
    row.submittedAt || '',
    row.auditDate || '',
    row.location || '',
    row.auditorId || '',
    row.auditorName || '',
    row.role || '',
    row.staffName || '',
    row.totalScore || 0,
    row.passCount || 0,
    row.failCount || 0,
    row.naCount || 0,
    row.answeredCount || 0,
    row.itemsCount || 0,
    row.notes || '',
    row.submittedByEmail || ''
  ]);
}

function appendItemRows_(sheet, rows) {
  if (!rows.length) {
    return;
  }

  var values = rows.map(function(row) {
    return [
      row.auditId || '',
      row.submittedAt || '',
      row.auditDate || '',
      row.location || '',
      row.auditorName || '',
      row.role || '',
      row.staffName || '',
      row.questionIndex || 0,
      row.question || '',
      row.status || '',
      row.statusLabel || '',
      row.comment || ''
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
}

function validatePayload_(payload) {
  if (!payload || payload.event !== 'audit_submitted') {
    throw new Error('Payload inválido: event');
  }

  if (!payload.audit || !payload.audit.id) {
    throw new Error('Payload inválido: audit.id');
  }

  if (!payload.sheet || !payload.sheet.summaryRow) {
    throw new Error('Payload inválido: sheet.summaryRow');
  }
}