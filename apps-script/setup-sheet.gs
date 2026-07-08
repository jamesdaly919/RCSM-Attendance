/**
 * ============================================================
 *  SETUP + ENTRYPAD + REPORTS SCRIPT (v4 · RC Santa Maria)
 *  Rotary Club of Santa Maria — Attendance Sheet
 * ============================================================
 *
 *  TWO FUNCTIONS YOU CAN RUN:
 *
 *  ▸ setupWorkbook()  — run ONCE on a fresh, empty Google Sheet.
 *    Builds all tabs with the full RC Santa Maria roster preloaded
 *    (55 members + 2 honorary, with birthdays, positions,
 *    recognitions, and past-president years), plus EntryPad,
 *    Reports, and July 2026 regular meetings.
 *
 *  ▸ upgradeSheet()   — run this on a sheet that was set up with an
 *    earlier version. Adds anything missing (new Meetings columns,
 *    Reports tab), rebuilds EntryPad/Lookup and the dropdowns.
 *    Safe to run any time; it never touches your recorded data.
 *
 *  WHAT'S NEW IN v3
 *  ----------------
 *  1. Meetings gains two columns:
 *       status      — set to "cancelled" and the event disappears from
 *                     the app, EntryPad, and everyone's requirements.
 *                     Blank or "scheduled" = normal.
 *       is_project  — set to "yes" for club projects; the app has a
 *                     Projects leaderboard counting these.
 *     The monthly requirement is now dynamic: it equals the number of
 *     scheduled regular meetings that month, capped at 4.
 *
 *  2. Reports tab + doPost(): members can tap "I was there — tell the
 *     admin" in the app when an event is wrongly marked missed. Each
 *     tap becomes a row here (status: new → reviewed → resolved).
 *     TO ACTIVATE: Deploy → New deployment → type "Web app" →
 *     Execute as: Me · Who has access: Anyone → Deploy → copy the
 *     Web app URL → paste it into REPORT_URL in the app's
 *     src/config.js. Full steps are in the README.
 *
 *  (v2 features kept: EntryPad fast recording, searchable name
 *  dropdowns, auto-expanding rows, duplicate protection.)
 *
 *  HOW TO INSTALL
 *  --------------
 *  1. Open the Google Sheet → Extensions → Apps Script.
 *  2. Replace everything in the editor with this whole file. Save.
 *  3. Run setupWorkbook (fresh) or upgradeSheet (existing), authorize
 *     when asked (your account → Advanced → Go to … → Allow).
 */

// ================================================================
//  MENU + SAVE TRIGGER
// ================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Rotary Tools")
    .addItem("Save EntryPad now", "saveEntryPad")
    .addItem("Clear EntryPad (without saving)", "clearEntryPad")
    .addItem("Upgrade sheet to latest version", "upgradeSheet")
    .addToUi();
}

// ================================================================
//  ATTENDANCE REPORTS ("I was there" button in the app)
//  The app POSTs here when a member says an event was wrongly
//  marked as missed. Each report becomes a row in the Reports tab.
//  To activate: Deploy → New deployment → Web app →
//  Execute as: Me · Who has access: Anyone → copy the URL into
//  src/config.js (REPORT_URL) in the app code.
// ================================================================

function doPost(e) {
  var out = { ok: false };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("Reports");
    if (!sh) throw new Error("Reports tab missing — run upgradeSheet.");
    var data = {};
    try { data = JSON.parse(e.postData.contents); } catch (ignored) {}
    var clean = function (v) { return String(v || "").slice(0, 300); };
    var when = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm");
    sh.appendRow([
      when,
      clean(data.member_id),
      clean(data.member_name),
      clean(data.meeting_id),
      clean(data.event_title),
      clean(data.message),
      "new",
    ]);
    out.ok = true;
  } catch (err) {
    out.error = String(err.message || err);
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function onEdit(e) {
  // Fires on every edit: EntryPad SAVE checkbox, and auto meeting IDs.
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    var name = sh.getName();
    // keep data tabs ahead of their data as they're edited by hand
    if (name === "Meetings" || name === "Attendance" ||
        name === "EarlyBird" || name === "Members" || name === "Reports") {
      ensureSheetCapacity_(sh);
    }
    if (name === "Meetings") {
      autoMeetingIds_(sh, e.range);
      return;
    }
    if (name !== "EntryPad") return;
    if (e.range.getA1Notation() !== "B2") return;
    if (e.value !== "TRUE" && e.value !== true) return;
    saveEntryPad();
  } catch (err) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast("Save failed: " + err.message, "Rotary Tools", 8);
  }
}

// ================================================================
//  AUTO MEETING IDs
//  Fill in date, meeting_type, and activity_title on the Meetings
//  tab and the meeting_id (column A) writes itself:
//    regular            → 20260714-REG
//    makeup/special     → 20260815-COASTAL  (first useful word of the
//                          title, letters/digits only, max 10 chars)
//  If that ID is already taken, a number is appended (…-REG2).
//  You can still type an ID by hand — the script never overwrites
//  a non-empty meeting_id cell.
// ================================================================

function autoMeetingIds_(sh, editedRange) {
  var firstRow = Math.max(editedRange.getRow(), 2);
  var lastRow = editedRange.getLastRow();
  if (lastRow < 2) return;
  var n = lastRow - firstRow + 1;
  var block = sh.getRange(firstRow, 1, n, 4).getValues(); // id, date, type, title

  // all existing ids (for uniqueness)
  var lastDataRow = sh.getLastRow();
  var existing = {};
  if (lastDataRow >= 2) {
    sh.getRange(2, 1, lastDataRow - 1, 1).getValues().forEach(function (r) {
      var v = String(r[0]).trim();
      if (v) existing[v.toUpperCase()] = true;
    });
  }

  var updates = 0;
  for (var i = 0; i < n; i++) {
    if (String(block[i][0]).trim() !== "") continue; // ID already there
    var date = normDate_(block[i][1]);
    var type = String(block[i][2] || "").trim().toLowerCase();
    var title = String(block[i][3] || "").trim();
    if (!date || !type) continue;
    if (type !== "regular" && !title) continue; // makeups need a title first
    var suffix = type === "regular" ? "REG" : suffixFromTitle_(title, type);
    var base = date.replace(/-/g, "") + "-" + suffix;
    var id = base;
    var k = 2;
    while (existing[id.toUpperCase()]) { id = base + k; k++; }
    existing[id.toUpperCase()] = true;
    sh.getRange(firstRow + i, 1).setValue(id);
    updates++;
  }
  if (updates > 0) {
    SpreadsheetApp.getActiveSpreadsheet()
      .toast("meeting_id filled in automatically for " + updates + " row" +
             (updates === 1 ? "" : "s") + ".", "Meetings", 5);
  }
}

function normDate_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v,
      SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
  }
  var s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function suffixFromTitle_(title, type) {
  var words = title.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/)
    .filter(function (w) { return w; });
  var skip = { THE: 1, A: 1, AN: 1, OF: 1, AND: 1, FOR: 1, TO: 1, IN: 1, ON: 1, WITH: 1 };
  var pick = "";
  for (var i = 0; i < words.length; i++) {
    if (!skip[words[i]] && words[i].length >= 3) { pick = words[i]; break; }
  }
  if (!pick) pick = words[0] || type.toUpperCase();
  return pick.slice(0, 10);
}

// ================================================================
//  ENTRYPAD: SAVE
// ================================================================

var PAD_FIRST_ROW = 5;
var PAD_LAST_ROW = 154; // room for 150 members

function saveEntryPad() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pad = ss.getSheetByName("EntryPad");
  if (!pad) throw new Error("EntryPad tab not found. Run upgradeEntryPad first.");
  var status = pad.getRange("C2");

  // 1. Which event?
  var eventLabel = String(pad.getRange("B1").getValue() || "");
  var meetingId = extractMeetingId_(eventLabel);
  if (!meetingId) {
    finishPad_(pad, status, "⚠ Pick an event in the yellow cell first — nothing was saved.");
    return;
  }
  var meeting = findMeeting_(ss, meetingId);
  if (!meeting) {
    finishPad_(pad, status, "⚠ Event \"" + meetingId + "\" is not in the Meetings tab — nothing was saved.");
    return;
  }
  if (meeting.cancelled) {
    finishPad_(pad, status, "⚠ \"" + meeting.title + "\" is marked cancelled — nothing was saved.");
    return;
  }
  var isRegular = String(meeting.type).toLowerCase() === "regular";

  // 2. Read the pad rows.
  var n = PAD_LAST_ROW - PAD_FIRST_ROW + 1;
  var values = pad.getRange(PAD_FIRST_ROW, 1, n, 5).getValues(); // Present, Member, EB, Credit, Notes

  // 3. What already exists (to skip duplicates)?
  var att = ss.getSheetByName("Attendance");
  var eb = ss.getSheetByName("EarlyBird");
  var existingPairs = existingPairs_(att, 1, 2);          // meeting|member
  var existingEB = existingPairs_(eb, 1, 3);              // meeting|member
  var existingRanks = existingMeetingValues_(eb, 1, 2);   // meeting|rank

  var attRows = [], ebRows = [];
  var skippedDup = 0, skippedBad = 0, ebIgnored = 0;

  for (var i = 0; i < values.length; i++) {
    var present = values[i][0] === true;
    var memberLabel = String(values[i][1] || "");
    var ebRank = String(values[i][2] || "").trim();
    var credit = String(values[i][3] || "").trim();
    var notes = String(values[i][4] || "").trim();
    if (!present) {
      if (ebRank) ebIgnored++; // rank typed but not marked present
      continue;
    }
    var memberId = extractMemberId_(memberLabel);
    if (!memberId) { skippedBad++; continue; }

    var pairKey = meetingId + "|" + memberId;
    if (existingPairs[pairKey]) {
      skippedDup++;
    } else {
      attRows.push([meetingId, memberId, credit === "" ? "1" : credit, notes]);
      existingPairs[pairKey] = true;
    }

    if (ebRank !== "") {
      if (!isRegular) {
        ebIgnored++;
      } else if (existingEB[pairKey] || existingRanks[meetingId + "|" + ebRank]) {
        ebIgnored++;
      } else {
        ebRows.push([meetingId, ebRank, memberId, ""]);
        existingEB[pairKey] = true;
        existingRanks[meetingId + "|" + ebRank] = true;
      }
    }
  }

  // 4. Append (growing the sheets first if they're near their row limit).
  if (attRows.length > 0) {
    ensureRows_(att, attRows.length);
    att.getRange(att.getLastRow() + 1, 1, attRows.length, 4).setValues(attRows);
  }
  if (ebRows.length > 0) {
    ensureRows_(eb, ebRows.length);
    eb.getRange(eb.getLastRow() + 1, 1, ebRows.length, 4).setValues(ebRows);
  }

  // 4b. Keep every tab comfortably ahead of its data.
  ensureCapacity_(ss);

  // 5. Clear the pad + report.
  clearPadRows_(pad);
  var when = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "MMM d, HH:mm");
  var msg = "✔ Saved " + attRows.length + " attendance row" + (attRows.length === 1 ? "" : "s");
  if (ebRows.length > 0) msg += " + " + ebRows.length + " Early Bird" + (ebRows.length === 1 ? "" : "s");
  msg += " for " + meeting.title + " (" + when + ").";
  if (skippedDup > 0) msg += " Skipped " + skippedDup + " already recorded.";
  if (ebIgnored > 0) msg += " Ignored " + ebIgnored + " EB rank" + (ebIgnored === 1 ? "" : "s") +
    (isRegular ? " (not marked present or rank already taken)." : " (event is not a regular meeting).");
  if (skippedBad > 0) msg += " " + skippedBad + " row(s) had an unreadable member label.";
  finishPad_(pad, status, msg);
}

function clearEntryPad() {
  var pad = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("EntryPad");
  if (!pad) return;
  clearPadRows_(pad);
  finishPad_(pad, pad.getRange("C2"), "EntryPad cleared — nothing was saved.");
}

// ---- capacity management ----
// Google Sheets tabs start with 1,000 rows and DO NOT grow by themselves
// when you type in the last row. These helpers keep every data tab at
// least 200 rows ahead of its data, growing in 500-row chunks. New rows
// inherit the dropdowns and formatting of the row above them, so nothing
// breaks as the sheet grows over the years. The Attendance tab is the
// fast-growing one (~400+ rows per month for this club), so it is topped
// up on every EntryPad save; the others are topped up whenever they are
// edited and whenever upgradeSheet runs.

var CAPACITY_CUSHION = 200;
var CAPACITY_CHUNK = 500;

function ensureSheetCapacity_(sh) {
  if (!sh) return;
  var free = sh.getMaxRows() - sh.getLastRow();
  if (free < CAPACITY_CUSHION) {
    sh.insertRowsAfter(sh.getMaxRows(), CAPACITY_CHUNK);
  }
}

function ensureCapacity_(ss) {
  ["Members", "Meetings", "Attendance", "EarlyBird", "Reports", "Lookup"]
    .forEach(function (name) { ensureSheetCapacity_(ss.getSheetByName(name)); });
}

// ---- save helpers ----

function ensureRows_(sheet, extraRowsNeeded) {
  // Google Sheets tabs have a fixed number of rows (1000 by default).
  // Before appending, make sure there's room — and add a 200-row cushion
  // so we don't do this on every save. New rows inherit the dropdowns
  // and formatting from the rows above them.
  var needed = sheet.getLastRow() + extraRowsNeeded;
  var max = sheet.getMaxRows();
  if (needed >= max) {
    sheet.insertRowsAfter(max, needed - max + 200);
  }
}

function finishPad_(pad, statusCell, message) {
  pad.getRange("B2").setValue(false); // uncheck SAVE
  statusCell.setValue(message);
  SpreadsheetApp.getActiveSpreadsheet().toast(message, "EntryPad", 8);
}

function clearPadRows_(pad) {
  var n = PAD_LAST_ROW - PAD_FIRST_ROW + 1;
  var falses = [];
  for (var i = 0; i < n; i++) falses.push([false]);
  pad.getRange(PAD_FIRST_ROW, 1, n, 1).setValues(falses); // untick Present
  pad.getRange(PAD_FIRST_ROW, 3, n, 3).clearContent();    // EB, Credit, Notes
}

function extractMemberId_(text) {
  var m = String(text).match(/M\d{3,}/i);
  return m ? m[0].toUpperCase() : null;
}

function extractMeetingId_(text) {
  var m = String(text).match(/\d{8}-[A-Za-z0-9]+/);
  return m ? m[0] : null;
}

function findMeeting_(ss, meetingId) {
  var sh = ss.getSheetByName("Meetings");
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var statusIdx = headers.indexOf("status"); // may be -1 on old sheets
  var data = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), lastCol).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === meetingId) {
      return {
        id: meetingId,
        date: data[i][1],
        type: data[i][2],
        title: data[i][3],
        cancelled: statusIdx >= 0 &&
          String(data[i][statusIdx]).trim().toLowerCase() === "cancelled",
      };
    }
  }
  return null;
}

function existingPairs_(sheet, colA, colB) {
  var out = {};
  var last = sheet.getLastRow();
  if (last < 2) return out;
  var data = sheet.getRange(2, 1, last - 1, Math.max(colA, colB)).getValues();
  for (var i = 0; i < data.length; i++) {
    var a = extractMeetingId_(data[i][colA - 1]) || String(data[i][colA - 1]).trim();
    var b = extractMemberId_(data[i][colB - 1]) || String(data[i][colB - 1]).trim();
    if (a && b) out[a + "|" + b] = true;
  }
  return out;
}

function existingMeetingValues_(sheet, meetingCol, valueCol) {
  var out = {};
  var last = sheet.getLastRow();
  if (last < 2) return out;
  var data = sheet.getRange(2, 1, last - 1, Math.max(meetingCol, valueCol)).getValues();
  for (var i = 0; i < data.length; i++) {
    var a = extractMeetingId_(data[i][meetingCol - 1]) || String(data[i][meetingCol - 1]).trim();
    var v = String(data[i][valueCol - 1]).trim();
    if (a && v) out[a + "|" + v] = true;
  }
  return out;
}

// ================================================================
//  LOOKUP + ENTRYPAD + SMART DROPDOWNS (v2 upgrade)
// ================================================================

function upgradeSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ["Members", "Meetings", "Attendance", "EarlyBird"].forEach(function (name) {
    if (!ss.getSheetByName(name)) {
      throw new Error('Tab "' + name + '" is missing. Run setupWorkbook first.');
    }
  });
  ensureMeetingsColumns_(ss);
  ensureReportsTab_(ss);
  var addedSettings = ensureSettings_(ss);
  // refresh dropdowns that were previously only set at first setup:
  dropdown_(ss.getSheetByName("EarlyBird"), 2, ["1", "2", "3", "4", "5"]); // rank
  dropdown_(ss.getSheetByName("Members"), 6, ["Active", "Inactive", "Honorary"]);
  buildLookup_(ss);
  buildEntryPad_(ss);
  applySmartValidations_(ss);
  ensureCapacity_(ss);
  SpreadsheetApp.flush();
  try {
    SpreadsheetApp.getUi().alert(
      "Sheet upgraded!\n\n" +
      "\u00b7 EntryPad and all dropdowns rebuilt (roster alphabetical by last name, " +
      "Early Bird ranks 1-5 everywhere, including the EarlyBird tab).\n" +
      "\u00b7 meeting_id auto-fills on the Meetings tab from date + type + title.\n" +
      (addedSettings.length > 0
        ? "\u00b7 Added missing Settings rows: " + addedSettings.join(", ") +
          " (existing values were NOT changed).\n"
        : "\u00b7 Settings already complete - nothing was changed there.\n") +
      "\u00b7 Every data tab now keeps at least 200 spare rows and grows itself " +
      "in 500-row chunks, so the 1,000-row limit will never be hit."
    );
  } catch (ignored) {}
}

// kept for anyone following older instructions
function upgradeEntryPad() { upgradeSheet(); }

function ensureMeetingsColumns_(ss) {
  var sh = ss.getSheetByName("Meetings");
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var col;

  // status column: blank or "scheduled" = happening; "cancelled" = doesn't count
  col = headers.indexOf("status") + 1;
  if (col === 0) {
    col = lastCol + 1;
    sh.getRange(1, col).setValue("status")
      .setFontWeight("bold").setBackground("#17458F").setFontColor("#FFFFFF");
    lastCol = col;
  }
  dropdownAllowBlank_(sh, col, ["scheduled", "cancelled"]);
  var statusCol = col;

  // is_project column: yes = counts on the Projects leaderboard
  var headers2 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  col = headers2.indexOf("is_project") + 1;
  if (col === 0) {
    col = sh.getLastColumn() + 1;
    sh.getRange(1, col).setValue("is_project")
      .setFontWeight("bold").setBackground("#17458F").setFontColor("#FFFFFF");
  }
  dropdownAllowBlank_(sh, col, ["yes", "no"]);

  return statusCol;
}

function dropdownAllowBlank_(sheet, col, values) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(true) // blank cells are fine
    .build();
  sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

// Adds any Settings rows that are missing (new keys introduced by later
// script versions). NEVER changes a value that already exists — the club's
// own numbers always win. Returns the list of keys it added.
function ensureSettings_(ss) {
  var sh = ss.getSheetByName("Settings");
  if (!sh) return [];
  var wanted = [
    ["club_name", "Rotary Club of Santa Maria"],
    ["monthly_required_attendance", "2"],
    ["monthly_required_percent", "50"],
    ["club_goal_percent", "50"],
    ["early_bird_slots_per_regular_meeting", "5"],
    ["timezone", "Asia/Manila"],
    ["current_rotary_year_start", "2026-07-01"],
    ["current_rotary_year_end", "2027-06-30"],
  ];
  var last = sh.getLastRow();
  var have = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
      var k = String(r[0]).trim();
      if (k) have[k] = true;
    });
  }
  var added = [];
  wanted.forEach(function (pair) {
    if (!have[pair[0]]) {
      sh.appendRow(pair);
      added.push(pair[0]);
    }
  });
  return added;
}

function ensureReportsTab_(ss) {
  if (ss.getSheetByName("Reports")) return;
  var sh = ss.insertSheet("Reports");
  writeTable_(sh,
    ["timestamp", "member_id", "member_name", "meeting_id", "event_title", "message", "status"],
    []);
  dropdown_(sh, 7, ["new", "reviewed", "resolved"]);
  sh.setColumnWidth(3, 240);
  sh.setColumnWidth(5, 240);
  sh.setColumnWidth(6, 280);
}

function buildLookup_(ss) {
  var old = ss.getSheetByName("Lookup");
  if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet("Lookup");
  sh.getRange("A1:F1").setValues([[
    "member_label", "member_id", "last_name", "first_name",
    "meeting_label", "meeting_id"
  ]]).setFontWeight("bold");
  // Live formulas: new members/events show up in dropdowns automatically.
  // Members are SORTED by last name (then first name), so the EntryPad
  // roster and all name dropdowns stay alphabetical no matter where a
  // new member's row is added on the Members tab.
  sh.getRange("A2").setFormula(
    '=SORT(FILTER({Members!E2:E&" · "&Members!C2:C&" "&Members!B2:B&" · "&Members!A2:A, ' +
    'Members!A2:A, Members!B2:B, Members!C2:C}, Members!A2:A<>""), 3, TRUE, 4, TRUE)'
  );

  // Event labels skip cancelled events so they can't be picked on EntryPad.
  var meetings = ss.getSheetByName("Meetings");
  var headers = meetings.getRange(1, 1, 1, meetings.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var statusIdx = headers.indexOf("status");
  var cancelledTest = "";
  if (statusIdx >= 0) {
    var letter = columnLetter_(statusIdx + 1);
    cancelledTest = '+(LOWER(Meetings!' + letter + '2:' + letter + ')="cancelled")';
  }
  sh.getRange("E2").setFormula(
    '=ARRAYFORMULA(IF((Meetings!A2:A="")' + cancelledTest +
    ',,Meetings!B2:B&" · "&Meetings!D2:D&" · "&Meetings!A2:A))'
  );
  sh.getRange("F2").setFormula('=ARRAYFORMULA(IF(Meetings!A2:A="",,Meetings!A2:A))');
  sh.hideSheet();
}

function columnLetter_(col) {
  var letter = "";
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function buildEntryPad_(ss) {
  var old = ss.getSheetByName("EntryPad");
  if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet("EntryPad", 0); // first position — it's the daily tab

  // Header area
  sh.getRange("A1").setValue("Event:").setFontWeight("bold");
  sh.getRange("B1:E1").merge();
  sh.getRange("B1")
    .setBackground("#FFF3CC")
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(ss.getRange("Lookup!E2:E"), true)
        .setAllowInvalid(false)
        .setHelpText("Pick the meeting or activity. Type part of its title or date to search.")
        .build()
    );
  sh.getRange("A2").setValue("Tick to SAVE →").setFontWeight("bold");
  sh.getRange("B2").insertCheckboxes().setBackground("#D7F2DC");
  sh.getRange("C2:E2").merge();
  sh.getRange("C2").setValue("Pick the event, tick attendees, then tick SAVE.").setFontStyle("italic");
  sh.getRange("A3").setValue("EB rank = Early Bird order of arrival (1–5), regular meetings only. Credit blank = 1.")
    .setFontSize(9).setFontColor("#666666");
  sh.getRange("A3:E3").merge();

  // Table headers
  sh.getRange("A4:E4").setValues([["Present", "Member", "EB rank", "Credit", "Notes"]])
    .setFontWeight("bold").setBackground("#17458F").setFontColor("#FFFFFF");
  sh.setFrozenRows(4);

  var n = PAD_LAST_ROW - PAD_FIRST_ROW + 1;
  sh.getRange(PAD_FIRST_ROW, 1, n, 1).insertCheckboxes();
  sh.getRange(PAD_FIRST_ROW, 2, 1, 1).setFormula('=ARRAYFORMULA(Lookup!A2:A' + (n + 1) + ')');
  sh.getRange(PAD_FIRST_ROW, 3, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["1","2","3","4","5"], true)
      .setAllowInvalid(false)
      .build()
  );
  sh.setColumnWidth(1, 64);
  sh.setColumnWidth(2, 320);
  sh.setColumnWidth(3, 70);
  sh.setColumnWidth(4, 60);
  sh.setColumnWidth(5, 180);
  sh.getRange(PAD_FIRST_ROW, 2, n, 1).protect()
    .setDescription("Member labels come from the Members tab — don't type here.")
    .setWarningOnly(true);
}

function applySmartValidations_(ss) {
  // Attendance + EarlyBird: member and meeting columns accept BOTH the
  // plain ID and the searchable label. Typing a nickname or surname
  // brings up suggestions.
  var att = ss.getSheetByName("Attendance");
  var eb = ss.getSheetByName("EarlyBird");
  // Open-ended ranges (no row number) so the dropdowns keep working no
  // matter how many members or events accumulate over the years.
  var memberSource = ss.getRange("Lookup!A2:B");   // labels + ids (alphabetical)
  var meetingSource = ss.getRange("Lookup!E2:F");

  smartDrop_(att, 1, meetingSource, "Type the meeting title, date, or ID.");
  smartDrop_(att, 2, memberSource, "Type a nickname, name, or member ID.");
  smartDrop_(eb, 1, meetingSource, "Type the meeting title, date, or ID.");
  smartDrop_(eb, 3, memberSource, "Type a nickname, name, or member ID.");
}

function smartDrop_(sheet, col, sourceRange, help) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sourceRange, true)
    .setAllowInvalid(true) // old plain-ID rows stay valid; app resolves both
    .setHelpText(help)
    .build();
  sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

// ================================================================
//  ONE-TIME SETUP (same as v1, now also builds EntryPad)
// ================================================================

function setupWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var wanted = ["Settings", "Members", "Meetings", "Attendance", "EarlyBird"];
  for (var i = 0; i < wanted.length; i++) {
    if (ss.getSheetByName(wanted[i])) {
      throw new Error(
        'A tab named "' + wanted[i] + '" already exists — setup already ran. ' +
        "If you only want the new EntryPad, run upgradeEntryPad instead."
      );
    }
  }

  var old = ss.getSheets()[0];
  if (old && wanted.indexOf(old.getName()) === -1) {
    old.setName("Original sheet (reference)");
  }

  buildSettings_(ss);
  buildMembers_(ss);
  buildMeetings_(ss);
  buildAttendance_(ss);
  buildEarlyBird_(ss);
  ensureMeetingsColumns_(ss);
  ensureReportsTab_(ss);
  buildLookup_(ss);
  buildEntryPad_(ss);
  applySmartValidations_(ss);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "Done! The 5 data tabs are ready with the full RC Santa Maria roster " +
    "(birthdays, positions, recognitions, past presidents) preloaded, and the " +
    "EntryPad tab is set up for fast attendance recording.\n\n" +
    "Check the Meetings tab: July was seeded with Tuesday regular meetings — " +
    "adjust the dates if the club meets on a different day."
  );
}

// ---------------------------------------------------------- builders

function writeTable_(sheet, headers, rows) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold")
    .setBackground("#17458F")
    .setFontColor("#FFFFFF");
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function textColumn_(sheet, col) {
  sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat("@");
}

function dropdown_(sheet, col, values) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

function buildSettings_(ss) {
  var sh = ss.insertSheet("Settings");
  writeTable_(sh, ["setting_key", "setting_value"], [
    ["club_name", "Rotary Club of Santa Maria"],
    ["monthly_required_attendance", "2"],
    ["monthly_required_percent", "50"],
    ["club_goal_percent", "50"],
    ["early_bird_slots_per_regular_meeting", "5"],
    ["timezone", "Asia/Manila"],
    ["current_rotary_year_start", "2026-07-01"],
    ["current_rotary_year_end", "2027-06-30"],
  ]);
  textColumn_(sh, 2);
}

function buildMembers_(ss) {
  var sh = ss.insertSheet("Members");
  // MEMBERS_ rows: [id, last, first, middle, nickname, status,
  //                 birthday, rotary_id, classification, club_position,
  //                 recognition, past_president, notes]
  var data = MEMBERS_.map(function (m) {
    return [m[0], m[1], m[2], m[3], m[4], m[5], "", "", m[12],
            m[6], m[7], m[8], m[9], m[10], m[11]];
  });
  writeTable_(sh,
    ["member_id", "last_name", "first_name", "middle_name", "nickname",
     "active_status", "join_date", "end_date", "notes",
     "birthday", "rotary_id", "classification", "club_position",
     "recognition", "past_president"],
    data);
  textColumn_(sh, 7);   // join_date
  textColumn_(sh, 8);   // end_date
  textColumn_(sh, 10);  // birthday ("January 3")
  textColumn_(sh, 11);  // rotary_id (keep leading digits intact)
  dropdown_(sh, 6, ["Active", "Inactive", "Honorary"]);
  sh.setColumnWidth(12, 220); // classification
  sh.setColumnWidth(13, 220); // club_position
  sh.setColumnWidth(14, 320); // recognition
}

function buildMeetings_(ss) {
  var sh = ss.insertSheet("Meetings");
  var data = MEETINGS_.map(function (m) {
    // m = [id, date, type, title, is_project]
    return [m[0], m[1], m[2], m[3], "", "1", "", "", m[4] || ""];
  });
  writeTable_(sh,
    ["meeting_id", "date", "meeting_type", "activity_title",
     "location", "credit_value", "notes", "status", "is_project"],
    data);
  textColumn_(sh, 2);
  dropdown_(sh, 3, ["regular", "makeup", "special"]);
}

function buildAttendance_(ss) {
  var sh = ss.insertSheet("Attendance");
  var rows = ATTENDANCE_.map(function (pair) {
    return [pair[0], pair[1], "1", ""];
  });
  writeTable_(sh, ["meeting_id", "member_id", "credit_given", "notes"], rows);
}

function buildEarlyBird_(ss) {
  var sh = ss.insertSheet("EarlyBird");
  writeTable_(sh, ["meeting_id", "rank", "member_id", "notes"], []);
  dropdown_(sh, 2, ["1","2","3","4","5"]);
}

// ---------------------------------------------------------- data

var MEMBERS_ = [
  ["M001","ALONZO JR.","BIENVENIDO","C.","JON","Active","March 19","5688805","Real Estate Leasing","Past District Governor 2019-2020","Paul Harris Society; Benefactor; Major Donor Level 1; Bequest Society Level 2","2009-2010",""],
  ["M002","BAJAO","PROTACIO","T.","BONG","Active","June 19","3154628","General Surgery","","Paul Harris Fellow","2005-2006",""],
  ["M003","BEASCA","ALEXANDER","","ALEX","Active","June 7","11316988","Real Estate Broker","","Paul Harris Fellow","",""],
  ["M004","CLEMENTE","MARK ANGELO","","MAC","Active","December 13","12198377","Govt. Service / Gas Station Management","","","",""],
  ["M005","COBO","CHRISTOPHER","E.","CHRIS","Active","November 9","12192364","Importer / Electrical Supplier","","Paul Harris Fellow","",""],
  ["M006","CORREA","MARIO","B.","BOBBY","Active","May 31","10701537","Government Service","Immediate Past President","Paul Harris Fellow +2","",""],
  ["M007","CRUZ","BERNARDO","A.","BONG","Active","September 10","12380337","Trucking Services","","Paul Harris Fellow","",""],
  ["M008","CRUZ","ERBITO","","ERBIE","Active","September 6","11029272","Banking Management","","Paul Harris Fellow","",""],
  ["M009","CRUZ","LUISITO","E.","LOUIE","Active","June 21","1812753","Criminal Law Practice","Vice President","Paul Harris Fellow","2002-2002 (?)","PP year unclear in source photo — verify"],
  ["M010","DEL ROSARIO","GARRY","","GARRY","Active","January 3","11179035","Civil Works","","","",""],
  ["M011","DELA CRUZ","DANILO","S.","DANNY","Active","June 28","2220851","Feeds Manufacturing","District Governor Nominee 2028-2029","Bequest Society Level 1; Benefactor; Paul Harris Fellow +6; Major Donor","2004-2005","Major Donor level not fully readable — verify"],
  ["M012","DELA CRUZ JR.","LEONARDO","I.","JUN","Active","December 12","2594743","Textile Distribution","Dir. / Club Membership Committee Chair","Paul Harris Fellow +2","2011-2012",""],
  ["M013","DELA ROSA","LUISITO","","BOY","Active","June 21","11509287","Cooperative Management","","Paul Harris Fellow","",""],
  ["M014","DELA TORRE","RODEL","I.","RODEL","Active","April 25","8598652","Electrical Engineering","Public Relations Officer","Paul Harris Fellow +1","2022-2023",""],
  ["M015","ENRIQUEZ","LUISITO","P.","LOUIE","Active","January 21","5688824","Flower Shop Management","Protocol Officer","Paul Harris Fellow +3","2014-2015",""],
  ["M016","ENRIQUEZ","REYNALDO","","REY","Active","November 28","9744423","Civil Engineering","","Paul Harris Fellow","",""],
  ["M017","FLORES","LUISITO","I.","LOUIE","Active","August 25","2220857","Hardware Service Management","Club Treasurer","Paul Harris Fellow","2018-2019",""],
  ["M018","FUENTES","CHRISTOPHER JOHN","","JOHN","Active","January 17","10381582","General Construction","Club Executive Secretary","Paul Harris Fellow","",""],
  ["M019","GERMAR","MARCELO","","MAR","Active","July 4","12611132","Retired US Service","","","",""],
  ["M020","GONZALES","JAY RAYMOND","","JAY","Active","February 17","8600228","General Construction","Dir. / Service Projects Committee Chair","Paul Harris Fellow +2","2019-2020",""],
  ["M021","GRAVADOR","RAMIL","","RAMIL","Active","June 20","12380342","General Construction","","Paul Harris Fellow","",""],
  ["M022","GRAVADOR","RICHARD","S.","RICHARD","Active","August 19","11862210","General Construction","","Paul Harris Fellow","",""],
  ["M023","GREGORIO","ANDRES","","ANDY","Active","September 5","10361392","Gov. Services / Construction Supply","","Paul Harris Fellow +1","",""],
  ["M024","GREGORIO JR.","FEDERICO","","YCO","Active","May 24","11179123","Glass & Aluminum Supply","Auditor","Paul Harris Fellow +1","",""],
  ["M025","GUMTAY","RAYMUND CHARLES","","CHARLES","Active","September 6","8267256","General Construction","Public Image Committee Chair","Paul Harris Fellow +1","",""],
  ["M026","HERMOGENES","ANACLETO","A.","LITO","Active","July 13","5895531","Civil Engineering","","Paul Harris Fellow","2012-2013",""],
  ["M027","HERMOGENES","ROLANDO","A.","ROLLING","Active","February 11","1344734","Motor Shop Management","","Paul Harris Fellow","1997-1998",""],
  ["M028","INOCENCIO","ARNOLD","S.","ARNOLD","Active","October 31","9334193","Pawnbroker","Club President","Paul Harris Fellow +2","",""],
  ["M029","JUAN","PABLO","","EBOY","Active","August 17","11738215","Govt. Service / Construction","","Paul Harris Fellow","",""],
  ["M030","LALWANI","MOSES","","MOSES","Active","October 15","11179044","Textile Manufacturing","","Major Donor Level 1","",""],
  ["M031","LAURENCIANA","JOHN GREG","","JOHN","Active","August 28","11503729","School Administrator","","Paul Harris Fellow","",""],
  ["M032","LAVIDES","GEORGE ANGELITO","","GEORGE","Active","May 18","10381585","Architecture","","Paul Harris Fellow","",""],
  ["M033","LAZARO","PRESCILIO","","ZALDY","Active","July 9","5895529","Tire Recaping","","Paul Harris Fellow +2","2010-2011",""],
  ["M034","LEGASPI","JESUS VICTOR","","JESS","Active","June 8","11179100","Builders and Supply","President Elect","Paul Harris Fellow","",""],
  ["M035","MARIANO","ALVIN","","ALVIN","Active","August 27","1812759","Engineering","","Paul Harris Fellow","","Rotary ID appears same as Conrado Mendoza's — verify"],
  ["M036","MARIANO","DOMINGO","","DOMENG","Active","May 10","8051793","Government Engineering","","Paul Harris Fellow","2013-2014",""],
  ["M037","MARTINEZ","EFREN","M.","EFREN","Active","September 28","263557","Sanitary Engineering","Past District Governor 2002-2003","Arch Klumph Society","1993-1994",""],
  ["M038","MARTINEZ","KHRISTOPHER","G.","TOPHER","Active","November 5","8051789","Heavy Equipment Rental","Dir. / The Rotary Foundation Chair","Benefactor; Major Donor Level 1","2016-2017",""],
  ["M039","MATEO","CRISANTO","","CRIS","Active","March 27","10000309","Advertising Design & Fabrication","Dir. / Youth Service Committee Chair","Paul Harris Fellow +3","2023-2024",""],
  ["M040","MATIAS","ANTONIO","F.","TONY","Active","May 10","2594744","Government Services - Military","","Paul Harris Fellow +1","2015-2016",""],
  ["M041","MENDOZA","CONRADO","","TETO","Active","November 26","1812759","Financing","","Paul Harris Fellow","2003-2004",""],
  ["M042","MORALES","OSCAR","D.","JR","Active","December 7","","Government Services","","Paul Harris Fellow","","Rotary ID not readable in source — add when known"],
  ["M043","PEREZ","VINCENT PAUL","","PAULO","Active","January 5","9308885","Publishing / Printing Management","","Paul Harris Fellow","",""],
  ["M044","PIÑON","SALVADOR","","SONNY","Active","May 6","263584","Architecture","Charter Member","Paul Harris Fellow","1996-1997",""],
  ["M045","POBLETE JR.","RUPERTO","","JONJO","Active","November 4","9108260","Bank Management","","Paul Harris Fellow +1","",""],
  ["M046","RAMOS","RICHARD","","RICHARD","Active","June 25","9334196","Optical Services","Dir. / Club Administration Chair","Benefactor; Paul Harris Fellow +4; Polio Plus Society","2020-2021",""],
  ["M047","RIVAS","MAGNUM","","MAGS","Active","July 8","12451577","Real Estate Leasing","","Paul Harris Fellow","",""],
  ["M048","SALONGA","BERNARD","","BERNARD","Active","May 16","12446215","Accounting Services","","Paul Harris Fellow","",""],
  ["M049","SAN MARTIN","BARTOLOME","","BART","Active","August 24","11012973","Housing Developer","","Paul Harris Fellow +1","2024-2025",""],
  ["M050","SAN MARTIN III","BARTOLOME","","THIRD","Active","December 11","11738205","Gen. Construction","","Paul Harris Fellow","",""],
  ["M051","SANTO DOMINGO","MELAQUIDES","","MEL","Active","December 10","12611142","Government Services","","","",""],
  ["M052","SANTOS JR.","CARLOS","N.","JUN","Active","May 21","5447349","Water Utility Management","","Paul Harris Fellow +2","2007-2008",""],
  ["M053","SHEWAKRAMANI","RAM","","RAM","Active","February 9","11179113","H&S Apparel","","Paul Harris Fellow","",""],
  ["M054","SY","ROBERT","","BOBBY","Active","April 23","5688774","Real Estate Management","","Paul Harris Fellow +1","",""],
  ["M055","TIQUI","LUISITO","R.","LOUIE","Active","July 29","5688797","Civil Works Contractor","","Paul Harris Fellow +2","",""],
  ["H001","RAMIREZ","BENIGNO EMILIO","P.","PDG BEN","Honorary","","","","Past District Governor","","","Honorary Member"],
  ["H002","RAMIREZ","RUMELIA","E.","RUMELIA","Honorary","","","","","","","Honorary Member"]
];

var MEETINGS_ = [
  // [id, date, type, title, is_project]
  // July 2026 regular meetings, assuming the club meets on Tuesdays —
  // edit or delete these rows in the sheet if the meeting day differs.
  ["20260707-REG","2026-07-07","regular","Regular Meeting",""],
  ["20260714-REG","2026-07-14","regular","Regular Meeting",""],
  ["20260721-REG","2026-07-21","regular","Regular Meeting",""],
  ["20260728-REG","2026-07-28","regular","Regular Meeting",""]
];

var ATTENDANCE_ = []; // fresh club sheet — attendance starts empty
