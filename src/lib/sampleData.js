// Demo data bundled with the app — the real RC Santa Maria roster plus a
// few made-up July 2026 meetings and attendance rows, so the app can be
// previewed (?demo=1) before the Google Sheet is connected or when the
// sheet is unreachable. Attendance here is FAKE; only the roster is real.

export const SAMPLE = {
  settings: [
    { setting_key: "club_name", setting_value: "Rotary Club of Santa Maria" },
    { setting_key: "monthly_required_attendance", setting_value: "2" },
    { setting_key: "monthly_required_percent", setting_value: "50" },
    { setting_key: "club_goal_percent", setting_value: "50" },
    { setting_key: "early_bird_slots_per_regular_meeting", setting_value: "5" },
    { setting_key: "timezone", setting_value: "Asia/Manila" },
    { setting_key: "current_rotary_year_start", setting_value: "2026-07-01" },
    { setting_key: "current_rotary_year_end", setting_value: "2027-06-30" },
  ],
  members: [
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
  ["H002","RAMIREZ","RUMELIA","E.","RUMELIA","Honorary","","","","","","","Honorary Member"],
  ].map(([member_id, last_name, first_name, middle_name, nickname, active_status,
          birthday, rotary_id, classification, club_position, recognition,
          past_president, notes]) => ({
    member_id, last_name, first_name, middle_name, nickname, active_status,
    join_date: "", end_date: "", notes,
    birthday, rotary_id, classification, club_position, recognition, past_president,
  })),
  meetings: [
    ["20260707-REG", "2026-07-07", "regular", "Regular Meeting", ""],
    ["20260711-GIFT", "2026-07-11", "makeup", "Gift Giving (demo project)", "yes"],
    ["20260714-REG", "2026-07-14", "regular", "Regular Meeting", ""],
    ["20260721-REG", "2026-07-21", "regular", "Regular Meeting", ""],
    ["20260728-REG", "2026-07-28", "regular", "Regular Meeting", ""],
  ].map(([meeting_id, date, meeting_type, activity_title, is_project]) => ({
    meeting_id, date, meeting_type, activity_title, location: "",
    credit_value: "1", notes: "", status: "", is_project,
  })),
  attendance: buildAttendance(),
  earlybird: buildEarlyBird(),
};

// Deterministic fake attendance so the demo has something to show:
// roughly two thirds of active members at the first meeting, half at the
// project. (Honorary members H001/H002 are never in these rows.)
function buildAttendance() {
  const rows = [];
  for (let i = 1; i <= 55; i++) {
    const id = "M" + String(i).padStart(3, "0");
    if (i % 3 !== 0) rows.push(row("20260707-REG", id));
    if (i % 2 === 0) rows.push(row("20260711-GIFT", id));
  }
  return rows;
}

function buildEarlyBird() {
  const firstFive = ["M022", "M030", "M006", "M014", "M041"];
  return firstFive.map((member_id, i) => ({
    meeting_id: "20260707-REG", rank: String(i + 1), member_id, notes: "",
  }));
}

function row(meeting_id, member_id) {
  return { meeting_id, member_id, credit_given: "1", notes: "" };
}
