// ============================================================
//  APP CONFIGURATION — Rotary Club of Santa Maria
//  This is the ONLY file you should ever need to edit.
// ============================================================

// The ID of the club's Google Sheet.
// It's the long code in the sheet's web address:
// https://docs.google.com/spreadsheets/d/  <THIS PART>  /edit
// ⚠ Fill this in after creating the RC Santa Maria sheet
// (see README, Part 1). Until then the app shows an error
// screen with a button to preview demo data.
export const SHEET_ID = "";

// The names of the tabs in the Google Sheet.
// Only change these if you rename the tabs in the sheet itself.
export const TABS = {
  settings: "Settings",
  members: "Members",
  meetings: "Meetings",
  attendance: "Attendance",
  earlyBird: "EarlyBird",
  reports: "Reports",
};

// The "I actually attended" report button posts to this Apps Script
// Web App URL. Leave "" to hide the feature. See the README section
// "Turn on attendance reports" for how to get this URL (5 minutes).
export const REPORT_URL = "";

// Fallback values used if the Settings tab is missing a row.
export const DEFAULTS = {
  club_name: "Rotary Club of Santa Maria",
  // Requirement = monthly_required_percent of that month's scheduled
  // (non-cancelled) regular meetings, rounded up. 4 meetings → 2 needed;
  // 3 → 2; 2 → 1; 1 → 1. If a month has no regular meetings entered yet,
  // monthly_required_attendance (2) applies as the fallback.
  monthly_required_attendance: 2,
  monthly_required_percent: 50,
  // The club's attendance goal for the whole Rotary year.
  club_goal_percent: 50,
  early_bird_slots_per_regular_meeting: 5,
  timezone: "Asia/Manila",
  current_rotary_year_start: "2026-07-01",
  current_rotary_year_end: "2027-06-30",
};
