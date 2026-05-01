const https = require("https");
const { Client } = require("pg");
require("dotenv").config();

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "node" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function getAdvice(teamId, freeTransfers) {
  const bootstrap = await get("https://fantasy.premierleague.com/api/bootstrap-static/");
  const current = bootstrap.events.find((e) => e.is_current);
  const gw = current.id;
  const nextGw = gw + 1;

  const picks = await get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${gw}/picks/`);

  const itb = picks.entry_history.bank / 10;
  const squadValue = picks.entry_history.value / 10;
  const squadIds = picks.picks.map((p) => p.element);
  const chip = picks.active_chip;

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    `SELECT p.id, p.name, t.id as "teamId", t.name as team, p.position,
            p.price::float, p.form::float, p."totalPoints",
            p."chanceOfPlayingNext", p."isInjured", p.status
     FROM players p
     JOIN teams t ON p."teamId" = t.id
     WHERE p.id = ANY($1)`,
    [squadIds]
  );

  const { rows: fixtures } = await db.query(
    `SELECT f.gameweek, f."homeTeamId", f."awayTeamId",
            ht.name as home_team, at.name as away_team,
            f."difficultyHome", f."difficultyAway"
     FROM fixtures f
     JOIN teams ht ON f."homeTeamId" = ht.id
     JOIN teams at ON f."awayTeamId" = at.id
     WHERE f.gameweek IN ($1, $2, $3)`,
    [nextGw, nextGw + 1, nextGw + 2]
  );

  // Per-team fixture picture across next 3 GWs
  function teamFixtureSummary(teamId) {
    return [nextGw, nextGw + 1, nextGw + 2].map((g) => {
      const gf = fixtures.filter(
        (f) => f.gameweek === g && (f.homeTeamId === teamId || f.awayTeamId === teamId)
      );
      const count = gf.length;
      const avgFdr = count === 0 ? null :
        gf.reduce((s, f) => s + (f.homeTeamId === teamId ? f.difficultyHome : f.difficultyAway), 0) / count;
      return { gw: g, count, avgFdr, isDgw: count === 2, isBgw: count === 0 };
    });
  }

  function scorePlayer(form, chanceOfPlaying, isInjured, fixtureSummary) {
    let s = 0;
    s += Math.min(form * 3, 30);
    const weights = [1.0, 0.7, 0.4];
    for (const [i, f] of fixtureSummary.entries()) {
      const w = weights[i];
      if (f.isBgw)       s -= 15 * w;
      else if (f.isDgw)  s += (6 - f.avgFdr) * 6 * 2 * w;
      else               s += (6 - f.avgFdr) * 6 * w;
    }
    if (chanceOfPlaying === 100) s += 5;
    if (chanceOfPlaying <= 50)   s -= 15;
    if (isInjured)               s -= 30;
    return Math.round(s * 10) / 10;
  }

  const squad = rows.map((p) => {
    const pick = picks.picks.find((pk) => pk.element === p.id);
    const fixtureSummary = teamFixtureSummary(p.teamId);
    const score = scorePlayer(p.form, p.chanceOfPlayingNext ?? 100, p.isInjured, fixtureSummary);
    return {
      ...p,
      isStarting: pick.position <= 11,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      fixtureSummary,
      score,
    };
  });

  // Team count across full squad (for 3-per-team rule)
  const teamCount = {};
  for (const p of squad) teamCount[p.teamId] = (teamCount[p.teamId] || 0) + 1;

  // Weakest starters sorted ascending by score
  const weakest = squad
    .filter((p) => p.isStarting)
    .sort((a, b) => a.score - b.score)
    .slice(0, freeTransfers);

  const suggestions = [];

  for (const outPlayer of weakest) {
    const budget = outPlayer.price + itb;

    const { rows: candidates } = await db.query(
      `SELECT p.id, p.name, t.id as "teamId", t.name as team, p.position,
              p.price::float, p.form::float, p."totalPoints",
              p."chanceOfPlayingNext", p."isInjured", p.status
       FROM players p
       JOIN teams t ON p."teamId" = t.id
       WHERE p.position = $1
         AND p.price::float <= $2
         AND p.id != ALL($3)
         AND p.status = 'a'
       ORDER BY p.form DESC
       LIMIT 50`,
      [outPlayer.position, budget, squadIds]
    );

    // Score candidates + apply 3-per-team rule
    const scored = candidates
      .filter((c) => (teamCount[c.teamId] || 0) < 3)
      .map((c) => {
        const fix = teamFixtureSummary(c.teamId);
        const score = scorePlayer(c.form, c.chanceOfPlayingNext ?? 100, c.isInjured, fix);
        return { ...c, fixtureSummary: fix, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    suggestions.push({
      transferOut: { name: outPlayer.name, team: outPlayer.team, position: outPlayer.position, price: outPlayer.price, form: outPlayer.form, score: outPlayer.score },
      transferIn: scored,
    });
  }

  await db.end();

  return {
    teamId,
    gameweek: gw,
    nextGameweek: nextGw,
    freeTransfers,
    itb,
    squadValue,
    chip,
    squad,
    suggestions,
  };
}

getAdvice(4328073, 2).then((result) => {
  // Print clean summary
  console.log(`\nGW${result.gameweek} squad → advising for GW${result.nextGameweek}`);
  console.log(`ITB: £${result.itb}m | Value: £${result.squadValue}m | FTs: ${result.freeTransfers}\n`);
  console.log(`${"Name".padEnd(18)} ${"Team".padEnd(16)} ${"Pos".padEnd(5)} ${"Form".padEnd(6)} ${"GW35".padEnd(8)} ${"GW36".padEnd(9)} ${"GW37".padEnd(7)} ${"Score".padEnd(7)} Slot`);
  console.log("-".repeat(90));
  const sorted = result.squad.sort((a, b) => (a.isStarting === b.isStarting ? b.score - a.score : a.isStarting ? -1 : 1));
  for (const p of sorted) {
    const slot = p.isStarting ? "XI" : "bench";
    const cap = p.isCaptain ? " (C)" : p.isViceCaptain ? " (V)" : "";
    const [f1, f2, f3] = p.fixtureSummary.map(f =>
      f.isBgw ? "BGW" : f.isDgw ? `DGW(${f.avgFdr?.toFixed(1)})` : `${f.avgFdr?.toFixed(1)}`
    );
    console.log(`${(p.name + cap).padEnd(18)} ${p.team.padEnd(16)} ${p.position.padEnd(5)} ${String(p.form).padEnd(6)} ${f1.padEnd(8)} ${f2.padEnd(9)} ${f3.padEnd(7)} ${String(p.score).padEnd(7)} ${slot}`);
  }

  console.log("\n--- TRANSFER SUGGESTIONS ---\n");
  for (const [i, s] of result.suggestions.entries()) {
    const out = s.transferOut;
    console.log(`Transfer ${i + 1}: OUT → ${out.name} (${out.team}, ${out.position}) | Form: ${out.form} | Score: ${out.score} | £${out.price}m`);
    console.log(`  Budget for replacement: £${(out.price + result.itb).toFixed(1)}m`);
    for (const [j, p] of s.transferIn.entries()) {
      const [f1, f2, f3] = p.fixtureSummary.map(f =>
        f.isBgw ? "BGW" : f.isDgw ? `DGW(${f.avgFdr?.toFixed(1)})` : `${f.avgFdr?.toFixed(1)}`
      );
      console.log(`    ${j + 1}. IN  → ${p.name} (${p.team}, ${p.position}) | Form: ${p.form} | Score: ${p.score} | £${p.price}m | ${f1} / ${f2} / ${f3}`);
    }
    console.log();
  }
});
