import { useEffect, useMemo, useState } from "react";
import { PercentRing } from "./Ring.jsx";
import { MemberPicker } from "./Shared.jsx";
import { memberName } from "../lib/stats.js";
import { loadDues, pinHash, matchAccess, accessStatus, registerDues, peso } from "../lib/dues.js";
import { clubDues, memberLedger, activeCharges, upcomingCharges, todayISO } from "../lib/duesStats.js";

const AUTH_KEY = "rcsm_dues_auth";

// ---------------------------------------------------------------
//  ACCESS TIERS
//  1 = own statement + club totals only
//  2 = + every member's balance / paid-through / arrears list
//  3 = + any member's full statement and payment details
//  Override per club via the Settings row "dues_role_levels",
//  e.g.  member:1,vp:2,president:3,treasurer:3,secretary:3
// ---------------------------------------------------------------
const DEFAULT_LEVELS = { member: 1, vp: 2, president: 2, treasurer: 3, secretary: 3, admin: 3 };

function roleLevel(settings, role) {
  const map = { ...DEFAULT_LEVELS };
  String(settings.dues_role_levels || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [r, l] = pair.split(":");
      if (r && l) map[r.trim().toLowerCase()] = parseInt(l, 10) || 1;
    });
  return map[String(role || "member").toLowerCase()] || 1;
}

function readAuth() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY)) || null; } catch { return null; }
}

export default function DuesPage({ model }) {
  const [dues, setDues] = useState({ loading: true, error: null, data: null });
  const [auth, setAuth] = useState(readAuth());

  useEffect(() => {
    let alive = true;
    loadDues()
      .then((data) => alive && setDues({ loading: false, error: null, data }))
      .catch((err) => alive && setDues({ loading: false, error: err.message, data: null }));
    return () => { alive = false; };
  }, []);

  const signIn = (a) => { sessionStorage.setItem(AUTH_KEY, JSON.stringify(a)); setAuth(a); };
  const signOut = () => { sessionStorage.removeItem(AUTH_KEY); setAuth(null); };

  if (dues.loading) {
    return <div className="page"><section className="card"><p className="muted">Loading dues…</p></section></div>;
  }
  if (dues.error) {
    return (
      <div className="page">
        <section className="card"><h2>Dues</h2><p className="muted">{dues.error}</p></section>
      </div>
    );
  }
  if (!auth) return <DuesLock model={model} dues={dues.data} onSignIn={signIn} />;

  const level = roleLevel(model.settings, auth.role);
  return (
    <DuesHome model={model} dues={dues.data} auth={auth} level={level} onSignOut={signOut} />
  );
}

// ================================================================
//  LOGIN + REGISTRATION
//  Name + PIN login always works (officers get PINs from the
//  secretary in phase 1). Self-registration only appears when the
//  Settings switch dues_member_access is "on".
// ================================================================

function DuesLock({ model, dues, onSignIn }) {
  const registrationOpen = String(model.settings.dues_member_access || "off") === "on";
  const salt = model.settings.dues_pin_salt || "";
  const [mode, setMode] = useState("login"); // login | register
  const [who, setWho] = useState(null);       // member_id or null
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const whoMember = who ? model.members.find((m) => m.member_id === who) : null;

  async function tryLogin(id) {
    setBusy(true); setMsg(null);
    try {
      const hash = await pinHash(salt, id, pin);
      const row = matchAccess(dues.access, id, hash);
      if (!row) {
        const st = id === "ADMIN" ? null : accessStatus(dues.access, id);
        if (st === "pending") throw new Error("Your registration is waiting for the secretary's approval.");
        throw new Error("That PIN didn't match. Check it and try again, or ask the secretary.");
      }
      onSignIn({ role: String(row.role || "member").toLowerCase(), memberId: id });
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  }

  async function tryRegister() {
    setBusy(true); setMsg(null);
    try {
      if (!whoMember) throw new Error("Pick your name first.");
      if (pin.length < 4) throw new Error("Choose a PIN of at least 4 characters.");
      if (pin !== pin2) throw new Error("The two PINs don't match.");
      const st = accessStatus(dues.access, who);
      if (st === "approved") throw new Error("An account already exists for this member — try logging in.");
      if (st === "pending") throw new Error("A registration for this member is already waiting for approval.");
      const hash = await pinHash(salt, who, pin);
      await registerDues({ memberId: who, memberName: memberName(whoMember).full, hash });
      setMsg("Request sent ✓ — the secretary will approve it, then you can log in with your PIN.");
      setMode("login"); setPin(""); setPin2("");
    } catch (err) { setMsg(err.message); }
    setBusy(false);
  }

  return (
    <div className="page">
      <section className="card">
        <h2>Dues · members only</h2>
        <p className="muted">
          Each member sees the club totals and their own record only. Club officers with a
          higher access tier see more. Log in with your PIN
          {registrationOpen ? ", or create your account below." : " (PINs are issued by the secretary)."}
        </p>

        {mode === "login" && (
          <div className="dues-lock">
            <p><strong>I'm a member or officer</strong></p>
            {whoMember ? (
              <p>Logging in as <strong>{memberName(whoMember).nickname}</strong>{" "}
                <button className="linklike" onClick={() => setWho(null)}>change</button></p>
            ) : (
              <MemberPicker members={model.activeMembers} onPick={setWho}
                placeholder="Search your name or nickname…" />
            )}
            <p><strong>Or the club admin login</strong></p>
            <div className="dues-lock__row">
              <input type="password" inputMode="numeric" value={pin} placeholder="PIN"
                onChange={(e) => setPin(e.target.value)} aria-label="PIN" />
              <button disabled={busy || !pin}
                onClick={() => tryLogin(whoMember ? who : "ADMIN")}>
                {busy ? "Checking…" : whoMember ? "Log in" : "Log in as admin"}
              </button>
            </div>
            {registrationOpen && (
              <p className="muted">First time here?{" "}
                <button className="linklike" onClick={() => { setMode("register"); setMsg(null); }}>
                  Create your account
                </button></p>
            )}
          </div>
        )}

        {mode === "register" && (
          <div className="dues-lock">
            <p><strong>Create your account</strong></p>
            <p className="muted">Pick <em>your own</em> name and choose a PIN. The secretary reviews every
              request, so registering as someone else won't be approved.</p>
            {whoMember ? (
              <p>Registering as <strong>{memberName(whoMember).full}</strong>{" "}
                <button className="linklike" onClick={() => setWho(null)}>change</button></p>
            ) : (
              <MemberPicker members={model.activeMembers} onPick={setWho} />
            )}
            <div className="dues-lock__row">
              <input type="password" inputMode="numeric" value={pin} placeholder="Choose a PIN"
                onChange={(e) => setPin(e.target.value)} aria-label="Choose a PIN" />
              <input type="password" inputMode="numeric" value={pin2} placeholder="Repeat PIN"
                onChange={(e) => setPin2(e.target.value)} aria-label="Repeat PIN" />
            </div>
            <div className="dues-lock__row">
              <button disabled={busy} onClick={tryRegister}>{busy ? "Sending…" : "Send request"}</button>
              <button className="linklike" onClick={() => { setMode("login"); setMsg(null); }}>Back to log in</button>
            </div>
          </div>
        )}

        {msg && <p className="dues-msg">{msg}</p>}
      </section>
    </div>
  );
}

// ================================================================
//  SIGNED-IN HOME — sections appear according to the access tier
// ================================================================

function DuesHome({ model, dues, auth, level, onSignOut }) {
  const iso = todayISO(model.settings.timezone);
  const club = useMemo(() => clubDues(model, dues, iso), [model, dues, iso]);
  const me = auth.memberId !== "ADMIN"
    ? model.members.find((m) => m.member_id === auth.memberId)
    : null;
  const myLedger = me ? memberLedger(me, club.charges, dues.payments) : null;
  const [focusId, setFocusId] = useState(null);
  const focus = level >= 3 && focusId
    ? club.ledgers.find((l) => l.member.member_id === focusId)
    : null;

  const roleLabel = auth.memberId === "ADMIN" ? "admin"
    : `${memberName(me || { }).nickname || auth.memberId} · ${auth.role}`;

  return (
    <div className="page">
      {/* -------- Level 1+: club totals (no names) -------- */}
      <ClubSummary club={club} roleLabel={roleLabel} onSignOut={onSignOut} />

      {/* -------- Level 1+: my own statement -------- */}
      {myLedger && (
        <section className="card">
          <h2>My dues · {memberName(me).nickname}</h2>
          <Statement ledger={myLedger} billing={dues.billing} iso={iso} />
        </section>
      )}

      {/* -------- Level 3: open any member's statement -------- */}
      {level >= 3 && (
        <section className="card">
          <h2>Look up a member</h2>
          <MemberPicker members={model.activeMembers} onPick={setFocusId}
            placeholder="Search a name to open their statement…" />
          {focus && (
            <>
              <div className="card__head" style={{ marginTop: "0.75rem" }}>
                <h3>{memberName(focus.member).full}</h3>
                <button className="linklike" onClick={() => setFocusId(null)}>close</button>
              </div>
              <Statement ledger={focus} billing={dues.billing} iso={iso} />
            </>
          )}
        </section>
      )}

      {/* -------- Level 2+: arrears list -------- */}
      {level >= 2 && (
        <section className="card">
          <h2>Members in arrears</h2>
          {club.arrears.length === 0 ? (
            <p className="muted">Nobody is behind — every member is settled or paid ahead 🎉</p>
          ) : (
            <ol className="board">
              {club.arrears.map((l, i) => (
                <li key={l.member.member_id}>
                  <span className="board__rank">{i + 1}</span>
                  {level >= 3 ? (
                    <button className="board__name" onClick={() => setFocusId(l.member.member_id)}>
                      {memberName(l.member).nickname}
                    </button>
                  ) : (
                    <span className="board__name">{memberName(l.member).nickname}</span>
                  )}
                  <span className="board__value dues-neg">{peso(l.balance)} owed</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* -------- Level 2+: every member's balance -------- */}
      {level >= 2 && (
        <section className="card">
          <h2>All members</h2>
          <table className="dues-table">
            <thead><tr><th>Member</th><th>Paid</th><th>Balance</th><th>Paid through</th></tr></thead>
            <tbody>
              {[...club.ledgers]
                .sort((a, b) => a.balance - b.balance)
                .map((l) => (
                  <tr key={l.member.member_id}>
                    <td>
                      {level >= 3 ? (
                        <button className="linklike" onClick={() => setFocusId(l.member.member_id)}>
                          {memberName(l.member).nickname}
                        </button>
                      ) : (
                        memberName(l.member).nickname
                      )}
                    </td>
                    <td>{peso(l.paid)}</td>
                    <td className={l.balance < -0.005 ? "dues-neg" : l.balance > 0.005 ? "dues-pos" : ""}>
                      {l.balance < -0.005 ? "−" : l.balance > 0.005 ? "+" : ""}{peso(l.balance)}
                    </td>
                    <td>{l.paidThrough || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ================================================================
//  CLUB SUMMARY — aggregate only, visible to every tier
// ================================================================

function ClubSummary({ club, roleLabel, onSignOut }) {
  return (
    <>
      <section className="hero card">
        <div className="hero__head">
          <p className="eyebrow">Club dues · Rotary year to date · {roleLabel}</p>
          <button className="linklike" onClick={onSignOut}>Log out</button>
        </div>
        <div className="hero__body">
          <PercentRing pct={club.ratePct} size={180}>
            <span className="ring-big">{club.ratePct}%</span>
            <span className="ring-sub">collected</span>
          </PercentRing>
          <div className="hero__stats">
            <div className="stat">
              <span className="stat__num">{peso(club.coveredTotal)}</span>
              <span className="stat__label">collected of {peso(club.billedTotal)} billed so far</span>
            </div>
            <div className="stat">
              <span className="stat__num">{peso(club.outstanding)}</span>
              <span className="stat__label">still outstanding club-wide</span>
            </div>
            <div className="stat">
              <span className="stat__num">{club.aheadCount + club.settledCount}</span>
              <span className="stat__label">of {club.payerCount} members settled or paid ahead</span>
            </div>
          </div>
        </div>
        <p className="hero__foot">
          The target for each month is the total dues that fall due that month across all{" "}
          {club.payerCount} dues-paying members — monthly, yearly and billed semester dues.
          Payments cover the oldest charge first, so bulk and advance payments count automatically.
        </p>
      </section>

      <section className="card">
        <h2>Collection vs target by month</h2>
        <table className="dues-table">
          <thead><tr><th>Month</th><th>Target</th><th>Collected</th><th>Rate</th></tr></thead>
          <tbody>
            {club.months.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{peso(r.billed)}</td>
                <td>{peso(r.covered)}</td>
                <td><span className={r.pct >= 100 ? "chip chip--gold" : "chip chip--needs"}>{r.pct}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Yearly and semester dues count in the month they fall due.</p>
      </section>
    </>
  );
}

// ================================================================
//  SHARED STATEMENT
// ================================================================

function Statement({ ledger, billing, iso }) {
  const upcoming = upcomingCharges(billing, iso);
  const b = ledger.balance;
  return (
    <div className="dues-statement">
      <p className="dues-balance">
        {b < -0.005 && <span className="chip chip--needs">Owes {peso(b)}</span>}
        {b > 0.005 && <span className="chip chip--gold">Paid ahead · {peso(b)} credit</span>}
        {Math.abs(b) <= 0.005 && <span className="chip chip--gold">Fully settled</span>}
        {ledger.paidThrough && <span className="muted"> Paid through: {ledger.paidThrough}</span>}
      </p>

      <h3>Charges to date</h3>
      <table className="dues-table">
        <thead><tr><th>Charge</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {ledger.charges.map((c) => (
            <tr key={c.charge_id}>
              <td>{c.label}</td>
              <td>{peso(c.amount)}</td>
              <td>
                {c.state === "paid" && <span className="chip chip--gold">Paid</span>}
                {c.state === "partial" && <span className="chip chip--needs">{peso(c.covered)} of {peso(c.amount)}</span>}
                {c.state === "unpaid" && <span className="chip chip--needs">Unpaid</span>}
              </td>
            </tr>
          ))}
          {ledger.charges.length === 0 && <tr><td colSpan="3" className="muted">No charges have fallen due yet.</td></tr>}
        </tbody>
      </table>

      <h3>Payments</h3>
      <table className="dues-table">
        <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Ref.</th></tr></thead>
        <tbody>
          {ledger.payments.map((p) => (
            <tr key={p.payment_id}>
              <td>{p.date}</td><td>{peso(p.amount)}</td>
              <td>{p.method || "—"}</td><td>{p.reference || "—"}</td>
            </tr>
          ))}
          {ledger.payments.length === 0 && <tr><td colSpan="4" className="muted">No payments recorded yet.</td></tr>}
        </tbody>
      </table>

      {upcoming.length > 0 && (
        <>
          <h3>Coming up</h3>
          <ul className="event-list">
            {upcoming.map((u, i) => (
              <li key={i}>
                <div>
                  <strong>{u.label}</strong>
                  <span className="muted">
                    {u.planned ? "amount set when the exchange rate is fixed" :
                      `${peso(u.amount)} · due ${u.due_date}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
