// ============================================================
//  src/lib/dues.js — data layer for the dues tracker
//  Fetches the three dues tabs, hashes PINs, sends registrations.
// ============================================================

import { SHEET_ID, REPORT_URL } from "../config.js";
import { csvToObjects } from "./csv.js";

const DUES_TABS = {
  billing: "DuesBilling",
  payments: "Payments",
  access: "DuesAccess",
};

function tabURL(tabName) {
  return (
    "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
    "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(tabName) + "&headers=1"
  );
}

async function fetchTab(tabName) {
  const res = await fetch(tabURL(tabName), { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load the "${tabName}" tab (HTTP ${res.status}).`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error(`The "${tabName}" tab returned a sign-in page instead of data.`);
  }
  return csvToObjects(text);
}

/** Loads all dues data. Throws a friendly error if the tabs don't exist yet. */
export async function loadDues() {
  try {
    const [billing, payments, access] = await Promise.all([
      fetchTab(DUES_TABS.billing),
      fetchTab(DUES_TABS.payments),
      fetchTab(DUES_TABS.access),
    ]);
    return { billing, payments, access };
  } catch (err) {
    throw new Error(
      "The dues tabs could not be loaded. If the secretary hasn't set them up yet, " +
      "run \"Rotary Dues → Set up / repair dues tabs\" in the Google Sheet. (" + err.message + ")"
    );
  }
}

/** SHA-256 hex of salt|MEMBER_ID|pin — must match duesPinHash_ in the Apps Script. */
export async function pinHash(salt, memberId, pin) {
  const raw = new TextEncoder().encode(
    (salt || "") + "|" + String(memberId).toUpperCase() + "|" + pin
  );
  const digest = await crypto.subtle.digest("SHA-256", raw);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Finds the approved access row matching a hash. Returns the row or null. */
export function matchAccess(access, memberId, hash) {
  const id = String(memberId).toUpperCase();
  return (
    access.find(
      (r) =>
        String(r.member_id || "").toUpperCase() === id &&
        String(r.pin_hash || "").toLowerCase() === hash &&
        String(r.status || "").toLowerCase() === "approved"
    ) || null
  );
}

/** Status of a member's access row: "approved" | "pending" | "disabled" | null. */
export function accessStatus(access, memberId) {
  const id = String(memberId).toUpperCase();
  const row = access.find((r) => String(r.member_id || "").toUpperCase() === id);
  return row ? String(row.status || "").toLowerCase() : null;
}

/**
 * Sends a self-registration request to the Apps Script web app.
 * Requires REPORT_URL to be set (the same web app used by attendance reports).
 */
export async function registerDues({ memberId, memberName, hash }) {
  if (!REPORT_URL) {
    throw new Error(
      "Registration isn't switched on yet — the club's web app hasn't been deployed. Ask the secretary."
    );
  }
  const res = await fetch(REPORT_URL, {
    method: "POST",
    body: JSON.stringify({
      kind: "dues_register",
      member_id: memberId,
      member_name: memberName,
      pin_hash: hash,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error || "The request could not be recorded. Try again later.");
  return true;
}

/** Peso formatter: ₱1,234.50 (drops the decimals when they're .00). */
export function peso(n) {
  const v = Number(n) || 0;
  const opts =
    Math.round(v * 100) % 100 === 0
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return "₱" + Math.abs(v).toLocaleString("en-PH", opts);
}
