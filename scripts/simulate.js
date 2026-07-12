/**
 * Headless full-auto match simulator for balance tuning.
 * Usage: node scripts/simulate.js [matches]
 */
import { createMatch, startMatch, updateMatch } from "../src/game.js";
import { MATCH_SECONDS } from "../src/data/teams.js";

const matches = Number(process.argv[2]) || 10;
const DT = 1 / 60;
const results = [];

for (let m = 0; m < matches; m++) {
  const state = createMatch();
  startMatch(state);
  state.mode = "auto";
  const maxFrames = Math.ceil((MATCH_SECONDS + 30) / DT);
  const shots = { china: 0, capeVerde: 0 };
  const possession = { china: 0, capeVerde: 0 };
  let prevOwner = null;
  for (let frame = 0; frame < maxFrames && state.status !== "ended"; frame++) {
    updateMatch(state, DT, { x: 0, y: 0 });
    if (state.possessionTeam) possession[state.possessionTeam]++;
    const owner = state.ball.ownerId;
    if (prevOwner && !owner && Math.abs(state.ball.vx) > 430) {
      const shooter = state.players.find(p => p.id === prevOwner);
      if (shooter) shots[shooter.teamId]++;
    }
    prevOwner = owner;
  }
  const posTotal = possession.china + possession.capeVerde || 1;
  results.push({ ...state.score, status: state.status });
  console.log(`Match ${m + 1}: 中国 ${state.score.china} — ${state.score.capeVerde} 佛得角 (${state.status})`
    + ` | shots ${shots.china}:${shots.capeVerde} | poss ${(possession.china / posTotal * 100).toFixed(0)}%:${(possession.capeVerde / posTotal * 100).toFixed(0)}%`);
}

const total = results.reduce((s, r) => s + r.china + r.capeVerde, 0);
const chinaGoals = results.reduce((s, r) => s + r.china, 0);
const cvGoals = results.reduce((s, r) => s + r.capeVerde, 0);
const maxSide = Math.max(...results.map(r => Math.max(r.china, r.capeVerde)));
console.log(`\nAvg goals/match: ${(total / matches).toFixed(2)} (china ${(chinaGoals / matches).toFixed(2)}, capeVerde ${(cvGoals / matches).toFixed(2)}), max per side: ${maxSide}`);
