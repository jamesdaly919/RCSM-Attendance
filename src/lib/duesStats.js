// ============================================================
//  src/lib/duesStats.js — all the dues math
//
//  The model is a LEDGER, not a checklist:
//    balance = (all payments) − (all charges due so far)
//  Positive balance = paid ahead. Negative = arrears. One bulk
//  payment covers many months automatically because payments are
//  spread over charges oldest-first (FIFO).
// ============================================================

// ---------- normalising ----------

function num(v) {
  const n = parseFloat(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function todayISO(timezone) {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone || "Asia/Manila" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Charges that count right now: status "billed", has an amount, due date reached. */
export function activeCharges(billing, iso) {
  return billing
    .filter(
      (c) =>
        String(c.status || "").toLowerCase() === "billed" &&
        num(c.amount_php) > 0 &&
        String(c.due_date || "") !== "" &&
        String(c.due_date) <= iso
    )
    .map((c) => ({
      charge_id: c.charge_id,
      type: String(c.type || "").toLowerCase(),
      label: c.label || c.charge_id,
      amount: num(c.amount_php),
      due_date: String(c.due_date),
      month: String(c.due_date).slice(0, 7),
    }))
    .sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
}

/** Everything on the schedule (for the member statement's "coming up" section). */
export function upcomingCharges(billing, iso) {
  return billing
    .filter(
      (c) =>
        String(c.status || "").toLowerCase() !== "waived" &&
        (String(c.status || "").toLowerCase() === "planned" || String(c.due_date || "") > iso)
    )
    .map((c) => ({
      label: c.label || c.charge_id,
      amount: num(c.amount_php),
      due_date: String(c.due_date || ""),
      planned: String(c.status || "").toLowerCase() === "planned",
    }))
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
    .slice(0, 4);
}

/** Members who owe dues: Active, not on the exempt list (e.g. honorary members). */
export function duesPayers(model) {
  const exempt = new Set(
    String(model.settings.dues_exempt_ids || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
  return model.activeMembers.filter((m) => !exempt.has(String(m.member_id).toUpperCase()));
}

/** A member only owes charges that fall within their membership dates. */
function chargesForMember(member, charges) {
  const joined = String(member.join_date || "").slice(0, 7); // month precision
  const ended = String(member.end_date || "");
  return charges.filter((c) => {
    if (joined && c.month < joined) return false;
    if (ended && c.due_date > ended) return false;
    return true;
  });
}

// ---------- the ledger ----------

/**
 * One member's full picture. FIFO: payments fill the oldest charge first.
 * Returns { charges:[{...,covered,state}], payments, paid, owedToDate,
 *           balance, paidThrough, nextDue }
 */
export function memberLedger(member, charges, payments) {
  const mine = chargesForMember(member, charges);
  const myPayments = payments
    .filter((p) => String(p.member_id).toUpperCase() === String(member.member_id).toUpperCase())
    .map((p) => ({ ...p, amount: num(p.amount_php), date: String(p.date || "") }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const paid = myPayments.reduce((s, p) => s + p.amount, 0);
  let pool = paid;
  const withCoverage = mine.map((c) => {
    const covered = Math.max(0, Math.min(c.amount, pool));
    pool -= covered;
    const state = covered >= c.amount ? "paid" : covered > 0 ? "partial" : "unpaid";
    return { ...c, covered, state };
  });

  const owedToDate = mine.reduce((s, c) => s + c.amount, 0);
  const lastPaid = [...withCoverage].reverse().find((c) => c.state === "paid");
  const nextDue = withCoverage.find((c) => c.state !== "paid");

  return {
    member,
    charges: withCoverage,
    payments: myPayments,
    paid,
    owedToDate,
    balance: paid - owedToDate, // >0 credit · <0 arrears
    paidThrough: lastPaid ? lastPaid.label : null,
    nextDue: nextDue || null,
  };
}

// ---------- club-wide ----------

/**
 * Everything the admin dashboard needs.
 * Collection rate = pesos actually covering due charges ÷ pesos billed to date.
 */
export function clubDues(model, dues, iso) {
  const charges = activeCharges(dues.billing, iso);
  const payers = duesPayers(model);
  const ledgers = payers.map((m) => memberLedger(m, charges, dues.payments));

  let billedTotal = 0;
  let coveredTotal = 0;
  const byMonth = new Map();

  for (const led of ledgers) {
    for (const c of led.charges) {
      billedTotal += c.amount;
      coveredTotal += c.covered;
      const row = byMonth.get(c.month) || { month: c.month, billed: 0, covered: 0 };
      row.billed += c.amount;
      row.covered += c.covered;
      byMonth.set(c.month, row);
    }
  }

  const months = [...byMonth.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map((r) => ({ ...r, pct: r.billed > 0 ? Math.round((r.covered / r.billed) * 100) : 100 }));

  const arrears = ledgers
    .filter((l) => l.balance < -0.005)
    .sort((a, b) => a.balance - b.balance);
  const ahead = ledgers.filter((l) => l.balance > 0.005).length;
  const settled = ledgers.filter((l) => Math.abs(l.balance) <= 0.005).length;

  return {
    charges,
    ledgers,
    months,
    billedTotal,
    coveredTotal,
    ratePct: billedTotal > 0 ? Math.round((coveredTotal / billedTotal) * 100) : 100,
    outstanding: Math.max(0, billedTotal - coveredTotal),
    arrears,
    aheadCount: ahead,
    settledCount: settled,
    payerCount: payers.length,
  };
}
