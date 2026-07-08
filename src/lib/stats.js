// ============================================================
//  All calculations happen here. The Google Sheet holds only
//  raw facts; this file turns them into stats for the app.
// ============================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayInManila(timezone = "Asia/Manila") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

export function monthKey(dateStr) {
  return (dateStr || "").slice(0, 7); // "2026-07"
}

export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${names[m - 1] || "?"} ${y}`;
}

export function memberName(m) {
  const full = [m.first_name, m.last_name].filter(Boolean).join(" ");
  return { nickname: m.nickname || m.first_name || m.member_id, full };
}

export function isHonorary(m) {
  return (m.active_status || "").trim().toLowerCase() === "honorary";
}

// ---------- birthdays ----------
// The Members tab stores birthdays as human text like "January 3".
// Also accepted: "Jan 3", "1/3", "01-03", or a full date "1990-01-03"
// (the year is ignored — only month and day are ever shown).

const MONTHS3 = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export function parseBirthday(text) {
  const raw = (text || "").trim().toLowerCase();
  if (!raw) return null;
  let m, d;
  let match = raw.match(/^([a-z]+)\.?\s+(\d{1,2})$/); // "january 3"
  if (match) {
    m = MONTHS3.indexOf(match[1].slice(0, 3)) + 1;
    d = parseInt(match[2], 10);
  } else if ((match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})$/))) { // "1/3" or "01-03"
    m = parseInt(match[1], 10);
    d = parseInt(match[2], 10);
  } else if ((match = raw.match(/^\d{4}-(\d{2})-(\d{2})$/))) { // "1990-01-03"
    m = parseInt(match[1], 10);
    d = parseInt(match[2], 10);
  } else {
    return null;
  }
  if (!m || m < 1 || m > 12 || !d || d < 1 || d > 31) return null;
  return { month: m, day: d };
}

export function birthdayLabel(member) {
  const b = parseBirthday(member.birthday);
  if (!b) return null;
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${names[b.month - 1]} ${b.day}`;
}

export function isBirthdayToday(member, today) {
  const b = parseBirthday(member.birthday);
  if (!b) return false;
  // today is "YYYY-MM-DD" in the club's timezone
  return today.slice(5) === `${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`;
}

export function birthdaysToday(model, today) {
  return model.members.filter(
    (m) => (m.active_status || "active").toLowerCase() !== "inactive" && isBirthdayToday(m, today)
  );
}

// ---------- honors (position, recognition, past president) ----------
// These come straight from the Members tab and are shown to everyone —
// recognitions like Paul Harris Fellow matter to the club.

export function memberHonors(m) {
  const recognitions = (m.recognition || "")
    .split(/[;,](?![^(]*\))/) // split on ; or , (not inside parentheses)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    position: (m.club_position || "").trim(),
    classification: (m.classification || "").trim(),
    recognitions,
    pastPresident: (m.past_president || "").trim(),
    honorary: isHonorary(m),
  };
}

// ---------- flexible references ----------
// The sheet may identify a member by member_id ("M001"), by nickname
// ("AIDA"), by full name ("MARIA AIDA ABAYA"), or by an EntryPad label
// ("AIDA · MARIA AIDA ABAYA · M001"). This resolver turns any of those
// into the canonical member_id. Same idea for meetings.

export function buildResolvers(members, meetings) {
  const memberIds = new Set(members.map((m) => m.member_id).filter(Boolean));
  const nameMap = new Map(); // normalized text -> id, or null if ambiguous
  const add = (key, id) => {
    const k = (key || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!k) return;
    if (nameMap.has(k) && nameMap.get(k) !== id) nameMap.set(k, null);
    else nameMap.set(k, id);
  };
  for (const m of members) {
    const id = m.member_id;
    if (!id) continue;
    const f = m.first_name || "", l = m.last_name || "", mid = m.middle_name || "";
    add(m.nickname, id);
    add(`${f} ${l}`, id);
    add(`${l} ${f}`, id);
    add(`${l}, ${f}`, id);
    add(`${f} ${mid} ${l}`, id);
  }
  const resolveMember = (s) => {
    const raw = (s || "").trim();
    if (!raw) return null;
    if (memberIds.has(raw)) return raw;
    const idMatch = raw.match(/\bM\d{3,}\b/i);
    if (idMatch) {
      const id = idMatch[0].toUpperCase();
      if (memberIds.has(id)) return id;
    }
    const hit = nameMap.get(raw.toLowerCase().replace(/\s+/g, " "));
    return hit || null;
  };

  const meetingIds = new Set(meetings.map((mt) => mt.meeting_id).filter(Boolean));
  const resolveMeeting = (s) => {
    const raw = (s || "").trim();
    if (!raw) return null;
    if (meetingIds.has(raw)) return raw;
    const idMatch = raw.match(/\b\d{8}-[A-Za-z0-9]+\b/);
    if (idMatch && meetingIds.has(idMatch[0])) return idMatch[0];
    return null;
  };
  return { resolveMember, resolveMeeting };
}

export function isCancelled(mt) {
  return (mt.status || "").trim().toLowerCase() === "cancelled";
}

export function isProject(mt) {
  return /^y/i.test((mt.is_project || "").trim());
}

// ---------- core model ----------

export function buildModel(raw) {
  const { settings, members, meetings, attendance: attendanceRaw, earlybird: earlybirdRaw, reports } = raw;

  const { resolveMember, resolveMeeting } = buildResolvers(members, meetings);

  // Resolved copies: member_id / meeting_id become canonical IDs (or null),
  // while member_ref / meeting_ref keep the original text for error messages.
  const attendance = attendanceRaw.map((r) => ({
    ...r,
    member_ref: r.member_id,
    meeting_ref: r.meeting_id,
    member_id: resolveMember(r.member_id),
    meeting_id: resolveMeeting(r.meeting_id),
  }));
  const earlybird = earlybirdRaw.map((r) => ({
    ...r,
    member_ref: r.member_id,
    meeting_ref: r.meeting_id,
    member_id: resolveMember(r.member_id),
    meeting_id: resolveMeeting(r.meeting_id),
  }));
  const required = settings.monthly_required_attendance; // fallback only
  const requiredPct = settings.monthly_required_percent;
  const goalPct = settings.club_goal_percent;
  const slots = settings.early_bird_slots_per_regular_meeting;

  const memberById = new Map(members.map((m) => [m.member_id, m]));
  const meetingById = new Map(meetings.map((mt) => [mt.meeting_id, mt]));

  // Honorary members are shown in the app and can be looked up, but they
  // have no attendance requirement, so they're excluded from club stats
  // and leaderboards (same as Inactive).
  const activeMembers = members.filter((m) => {
    const st = (m.active_status || "Active").toLowerCase();
    return st !== "inactive" && st !== "honorary";
  });

  const ryStart = settings.current_rotary_year_start;
  const ryEnd = settings.current_rotary_year_end;
  const inRotaryYear = (d) => d >= ryStart && d <= ryEnd;

  // credits[memberId][monthKey] = { credits, regular, makeup, projects, meetings: [] }
  const credits = new Map();
  const meetingAttendance = new Map(); // meetingId -> count
  const countedPairs = new Set(); // a duplicate row is flagged by validation, never double-counted
  for (const row of attendance) {
    const mt = meetingById.get(row.meeting_id);
    const mem = memberById.get(row.member_id);
    if (!mt || !mem) continue; // reported by validation instead
    if (isCancelled(mt)) continue; // cancelled events never count for or against anyone
    const pairKey = row.meeting_id + "|" + row.member_id;
    if (countedPairs.has(pairKey)) continue;
    countedPairs.add(pairKey);
    const credit = row.credit_given === "" ? 1 : parseFloat(row.credit_given) || 0;
    const mk = monthKey(mt.date);
    if (!credits.has(row.member_id)) credits.set(row.member_id, new Map());
    const perMonth = credits.get(row.member_id);
    if (!perMonth.has(mk))
      perMonth.set(mk, { credits: 0, regular: 0, makeup: 0, projects: 0, meetings: [] });
    const bucket = perMonth.get(mk);
    bucket.credits += credit;
    if ((mt.meeting_type || "").toLowerCase() === "regular") bucket.regular += 1;
    else bucket.makeup += 1;
    if (isProject(mt)) bucket.projects += 1;
    bucket.meetings.push(mt);
    meetingAttendance.set(row.meeting_id, (meetingAttendance.get(row.meeting_id) || 0) + 1);
  }

  // Early Bird counts
  const ebMonthly = new Map(); // memberId -> Map(monthKey -> count)
  const ebYearly = new Map(); // memberId -> count (current Rotary year)
  const ebByMeeting = new Map(); // meetingId -> [{rank, member_id}]
  for (const row of earlybird) {
    const mt = meetingById.get(row.meeting_id);
    if (!mt || !memberById.has(row.member_id)) continue;
    if (isCancelled(mt)) continue;
    const mk = monthKey(mt.date);
    if (!ebMonthly.has(row.member_id)) ebMonthly.set(row.member_id, new Map());
    const perMonth = ebMonthly.get(row.member_id);
    perMonth.set(mk, (perMonth.get(mk) || 0) + 1);
    if (inRotaryYear(mt.date)) {
      ebYearly.set(row.member_id, (ebYearly.get(row.member_id) || 0) + 1);
    }
    if (!ebByMeeting.has(row.meeting_id)) ebByMeeting.set(row.meeting_id, []);
    ebByMeeting.get(row.meeting_id).push(row);
  }
  for (const list of ebByMeeting.values()) {
    list.sort((a, b) => (parseInt(a.rank, 10) || 99) - (parseInt(b.rank, 10) || 99));
  }

  return {
    settings, required, requiredPct, goalPct, slots,
    members, activeMembers, meetings, attendance, earlybird,
    reports: reports || [],
    memberById, meetingById, resolveMember, resolveMeeting,
    credits, meetingAttendance,
    ebMonthly, ebYearly, ebByMeeting,
    ryStart, ryEnd, inRotaryYear,
  };
}

// ---------- per member ----------

// This month's requirement = 50% (monthly_required_percent) of the
// scheduled (non-cancelled) regular meetings that month, rounded up.
// Examples: 4 meetings -> 2 needed; 3 -> 2; 2 -> 1; 1 -> 1; 5 -> 3;
// 4 meetings with 2 cancelled -> 1. If no regular meetings are recorded
// for a month yet, the fallback (monthly_required_attendance, 2) applies —
// so keep the Meetings tab filled in at the start of each month.
export function scheduledRegularMeetings(model, mk) {
  let count = 0;
  for (const mt of model.meetings) {
    if (isCancelled(mt)) continue;
    if ((mt.meeting_type || "").toLowerCase() !== "regular") continue;
    if (monthKey(mt.date) === mk) count += 1;
  }
  return count;
}

export function requiredForMonth(model, mk) {
  const count = scheduledRegularMeetings(model, mk);
  if (count === 0) return model.required;
  return Math.max(1, Math.ceil((count * model.requiredPct) / 100));
}

export function memberMonth(model, memberId, mk) {
  const bucket = model.credits.get(memberId)?.get(mk) || {
    credits: 0, regular: 0, makeup: 0, projects: 0, meetings: [],
  };
  const required = requiredForMonth(model, mk);
  const remaining = Math.max(0, required - bucket.credits);
  const extra = Math.max(0, bucket.credits - required);
  let status = "needs";
  if (bucket.credits >= required) status = extra > 0 ? "exceeded" : "complete";
  return { ...bucket, required, remaining, extra, status };
}

export function memberYearCredits(model, memberId) {
  let total = 0;
  const perMonth = model.credits.get(memberId);
  if (perMonth) {
    for (const [mk, bucket] of perMonth) {
      if (mk >= monthKey(model.ryStart) && mk <= monthKey(model.ryEnd)) {
        total += bucket.credits;
      }
    }
  }
  return total;
}

export function memberMeetingsAttended(model, memberId) {
  const attended = [];
  const seen = new Set();
  for (const row of model.attendance) {
    if (row.member_id !== memberId || seen.has(row.meeting_id)) continue;
    seen.add(row.meeting_id);
    const mt = model.meetingById.get(row.meeting_id);
    if (mt && !isCancelled(mt)) attended.push(mt);
  }
  attended.sort((a, b) => (a.date < b.date ? -1 : 1));
  return attended;
}

export function memberYearProjects(model, memberId) {
  let total = 0;
  const perMonth = model.credits.get(memberId);
  if (perMonth) {
    for (const [mk, bucket] of perMonth) {
      if (mk >= monthKey(model.ryStart) && mk <= monthKey(model.ryEnd)) {
        total += bucket.projects;
      }
    }
  }
  return total;
}

// ---------- club level ----------

export function clubMonth(model, mk) {
  const required = requiredForMonth(model, mk);
  const active = model.activeMembers;
  let cappedSum = 0;
  let rawSum = 0;
  let completeCount = 0;
  for (const m of active) {
    const stat = memberMonth(model, m.member_id, mk);
    cappedSum += Math.min(stat.credits, required);
    rawSum += stat.credits;
    if (stat.credits >= required) completeCount += 1;
  }
  const target = active.length * required;
  return {
    required,
    activeCount: active.length,
    completeCount,
    lackingCount: active.length - completeCount,
    targetPct: target ? Math.round((cappedSum / target) * 100) : 0,
    rawCredits: rawSum,
  };
}

// ---------- club year goal ----------
// The club's goal is club_goal_percent (50%) attendance across the whole
// Rotary year. Progress = capped member credits summed over every month
// that has at least one scheduled regular meeting (up to the current
// month), divided by what full attendance of the requirement would be.
export function clubYear(model, today) {
  const startMk = monthKey(model.ryStart);
  const endMk = monthKey(model.ryEnd);
  const nowMk = monthKey(today);
  const active = model.activeMembers;
  let cappedSum = 0;
  let possible = 0;
  let monthsCounted = 0;
  let [y, m] = startMk.split("-").map(Number);
  for (let i = 0; i < 12; i++) {
    const mk = `${y}-${String(m).padStart(2, "0")}`;
    if (mk > endMk || mk > nowMk) break;
    if (scheduledRegularMeetings(model, mk) > 0) {
      const req = requiredForMonth(model, mk);
      monthsCounted += 1;
      possible += active.length * req;
      for (const mem of active) {
        const credits = model.credits.get(mem.member_id)?.get(mk)?.credits || 0;
        cappedSum += Math.min(credits, req);
      }
    }
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  const pct = possible ? Math.round((cappedSum / possible) * 100) : 0;
  return { pct, goal: model.goalPct, monthsCounted, onTrack: pct >= model.goalPct };
}

export function upcomingMeetings(model, today, limit = 3) {
  return model.meetings
    .filter((mt) => !isCancelled(mt) && DATE_RE.test(mt.date) && mt.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, limit);
}

export function monthOptions(model, today) {
  // Every month from the Rotary year start up to the later of
  // (current month, latest month with a recorded meeting).
  const start = monthKey(model.ryStart);
  let end = monthKey(today);
  for (const mt of model.meetings) {
    const mk = monthKey(mt.date);
    if (DATE_RE.test(mt.date) && mk > end && mk <= monthKey(model.ryEnd)) end = mk;
  }
  if (end < start) end = start;
  const out = [];
  let [y, m] = start.split("-").map(Number);
  while (true) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= end) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (out.length > 24) break; // safety
  }
  return out.reverse(); // newest first
}

// ---------- leaderboards ----------

function rankList(entries) {
  // entries: [{member, value}] sorted desc; adds shared ranks
  entries.sort((a, b) => b.value - a.value);
  let lastValue = null;
  let lastRank = 0;
  entries.forEach((e, i) => {
    if (e.value !== lastValue) {
      lastRank = i + 1;
      lastValue = e.value;
    }
    e.rank = lastRank;
  });
  return entries.filter((e) => e.value > 0);
}

export function leaderboards(model, mk) {
  const monthCredits = [];
  const yearCredits = [];
  const monthProjects = [];
  const yearProjects = [];
  const monthEB = [];
  const yearEB = [];
  for (const m of model.activeMembers) {
    const id = m.member_id;
    const monthStat = memberMonth(model, id, mk);
    monthCredits.push({ member: m, value: monthStat.credits });
    yearCredits.push({ member: m, value: memberYearCredits(model, id) });
    monthProjects.push({ member: m, value: monthStat.projects });
    yearProjects.push({ member: m, value: memberYearProjects(model, id) });
    monthEB.push({ member: m, value: model.ebMonthly.get(id)?.get(mk) || 0 });
    yearEB.push({ member: m, value: model.ebYearly.get(id) || 0 });
  }
  return {
    monthCredits: rankList(monthCredits),
    yearCredits: rankList(yearCredits),
    monthProjects: rankList(monthProjects),
    yearProjects: rankList(yearProjects),
    monthEB: rankList(monthEB),
    yearEB: rankList(yearEB),
  };
}

// ---------- attendance reports ----------

// Reports written by the app's "I was there" button contain plain IDs,
// but resolve them anyway in case an admin edits the tab by hand.
export function pendingReportSet(model) {
  const set = new Set();
  for (const r of model.reports) {
    const memberId = model.resolveMember(r.member_id);
    const meetingId = model.resolveMeeting(r.meeting_id);
    if (!memberId || !meetingId) continue;
    if ((r.status || "").trim().toLowerCase() === "resolved") continue;
    set.add(memberId + "|" + meetingId);
  }
  return set;
}

// ---------- validation ----------

export function validate(model) {
  const issues = [];
  const warn = (where, msg) => issues.push({ where, msg });

  // Members
  const seenIds = new Set();
  model.members.forEach((m, i) => {
    const line = `Members row ${i + 2}`;
    if (!m.member_id) warn(line, "member_id is empty.");
    else if (seenIds.has(m.member_id))
      warn(line, `Duplicate member_id "${m.member_id}".`);
    seenIds.add(m.member_id);
    if (!m.nickname && !m.first_name)
      warn(line, "Member has no nickname or first name.");
    const st = (m.active_status || "").toLowerCase();
    if (st && st !== "active" && st !== "inactive" && st !== "honorary")
      warn(line, `active_status "${m.active_status}" should be Active, Inactive, or Honorary.`);
    if ((m.birthday || "").trim() && !parseBirthday(m.birthday))
      warn(line, `birthday "${m.birthday}" isn't understood — write it like "January 3".`);
  });

  // Meetings
  const seenMeetings = new Set();
  model.meetings.forEach((mt, i) => {
    const line = `Meetings row ${i + 2}`;
    if (!mt.meeting_id) warn(line, "meeting_id is empty.");
    else if (seenMeetings.has(mt.meeting_id))
      warn(line, `Duplicate meeting_id "${mt.meeting_id}".`);
    seenMeetings.add(mt.meeting_id);
    if (!DATE_RE.test(mt.date))
      warn(line, `Date "${mt.date}" is not in YYYY-MM-DD format.`);
    const type = (mt.meeting_type || "").toLowerCase();
    if (!["regular", "makeup", "special"].includes(type))
      warn(line, `meeting_type "${mt.meeting_type}" should be regular, makeup, or special.`);
    if (mt.credit_value !== "" && isNaN(parseFloat(mt.credit_value)))
      warn(line, `credit_value "${mt.credit_value}" is not a number.`);
    const st = (mt.status || "").trim().toLowerCase();
    if (st && st !== "scheduled" && st !== "cancelled")
      warn(line, `status "${mt.status}" should be scheduled, cancelled, or blank.`);
    const proj = (mt.is_project || "").trim().toLowerCase();
    if (proj && proj !== "yes" && proj !== "no" && proj !== "y" && proj !== "n")
      warn(line, `is_project "${mt.is_project}" should be yes, no, or blank.`);
  });

  // Attendance
  const seenPairs = new Set();
  model.attendance.forEach((row, i) => {
    const line = `Attendance row ${i + 2}`;
    if (!row.meeting_id)
      warn(line, `Can't identify the meeting "${row.meeting_ref}". Use the meeting_id or the dropdown label.`);
    if (!row.member_id)
      warn(line, `Can't identify the member "${row.member_ref}". Use the member_id, exact nickname, or full name.`);
    if (!row.meeting_id || !row.member_id) return;
    const mtRow = model.meetingById.get(row.meeting_id);
    if (mtRow && isCancelled(mtRow))
      warn(line, `Attendance recorded for "${mtRow.activity_title}", which is cancelled — it won't be counted.`);
    const pair = row.meeting_id + "|" + row.member_id;
    if (seenPairs.has(pair))
      warn(line, `Duplicate: ${row.member_ref} is recorded twice for ${row.meeting_id}.`);
    seenPairs.add(pair);
  });

  // Early Bird
  const ranksPerMeeting = new Map();
  model.earlybird.forEach((row, i) => {
    const line = `EarlyBird row ${i + 2}`;
    const mt = model.meetingById.get(row.meeting_id);
    if (!row.meeting_id)
      warn(line, `Can't identify the meeting "${row.meeting_ref}". Use the meeting_id or the dropdown label.`);
    else if ((mt.meeting_type || "").toLowerCase() !== "regular")
      warn(line, `Early Bird recorded for "${mt.activity_title}", which is not a regular meeting.`);
    if (!row.member_id)
      warn(line, `Can't identify the member "${row.member_ref}". Use the member_id, exact nickname, or full name.`);
    const rank = parseInt(row.rank, 10);
    if (isNaN(rank) || rank < 1 || rank > model.slots)
      warn(line, `Rank "${row.rank}" should be between 1 and ${model.slots}.`);
    if (!row.meeting_id) return;
    const key = row.meeting_id;
    if (!ranksPerMeeting.has(key)) ranksPerMeeting.set(key, new Set());
    const set = ranksPerMeeting.get(key);
    if (set.has(rank))
      warn(line, `Rank ${rank} is used twice for meeting ${row.meeting_id}.`);
    set.add(rank);
    if (set.size > model.slots)
      warn(line, `Meeting ${row.meeting_id} has more than ${model.slots} Early Bird awardees.`);
  });

  return issues;
}
