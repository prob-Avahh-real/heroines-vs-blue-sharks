import {
  ACTIVE_COUNT, HALF_SECONDS, HALF_TIME_PAUSE, MATCH_DISPLAY_MINUTES,
  MATCH_SECONDS, TEAMS, activeRoster
} from "./data/teams.js";

/** 11 人制加长球场（画布 1280×720，草皮 1180×640）。 */
export const FIELD = { left: 50, right: 1230, top: 40, bottom: 680, goalTop: 276, goalBottom: 444 };
/** Pitch centre — also the kickoff spot. */
export const CENTER = { x: (FIELD.left + FIELD.right) / 2, y: (FIELD.top + FIELD.bottom) / 2 };
const PITCH_W = FIELD.right - FIELD.left;
const CORNER_INSET = 14;
const GOAL_AREA = { depth: 64, halfHeight: 79 };
const RESTART_LABELS = {
  throwIn: "边线球",
  goalKick: "门球",
  cornerKick: "角球",
  freeKick: "任意球",
  penaltyKick: "点球",
  offside: "越位",
  kickoff: "开球"
};
/** Penalty mark inset from the goal line (matches the 168px penalty-area depth). */
const PENALTY_MARK = 108;
/** Lenience so level-with-defender through balls are not whistled every time. */
const OFFSIDE_TOLERANCE = 14;
export { RESTART_LABELS };

const oppositeTeam = teamId => (teamId === "china" ? "capeVerde" : "china");

function makeOfficials() {
  return {
    arLeft: { y: CENTER.y, flag: false, flagTimer: 0 },
    arRight: { y: CENTER.y, flag: false, flagTimer: 0 }
  };
}

function trackTouch(state, teamId) {
  state.ball.lastTeam = teamId;
  state.lastTouchTeamId = teamId;
}

function teamAttackingGoal(state, goalSide) {
  const attacksRight = state.sides.china > 0 ? "china" : "capeVerde";
  return goalSide === "right" ? attacksRight : oppositeTeam(attacksRight);
}

function teamDefendingGoal(state, goalSide) {
  return oppositeTeam(teamAttackingGoal(state, goalSide));
}

function touchTeamForRestart(state) {
  return state.lastTouchTeamId ?? state.ball.lastTeam ?? "china";
}

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const normalize = (x, y) => {
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
};

const slotOf = player => TEAMS[player.teamId].formation.slots[player.index];
const tacticsOf = player => TEAMS[player.teamId].tactics;

/** Roster index of the team's first striker (kickoff taker / default selection). */
export function strikerIndex(teamId) {
  return TEAMS[teamId].formation.slots.findIndex(slot => slot.role === "ST");
}

function slotPoint(team, index, attack) {
  const slot = team.formation.slots[index];
  const mirrored = attack > 0 ? slot.x : 1 - slot.x;
  return {
    x: FIELD.left + mirrored * PITCH_W,
    y: FIELD.top + slot.y * (FIELD.bottom - FIELD.top)
  };
}

function makePlayers(team) {
  const attack = team.side === "left" ? 1 : -1;
  return activeRoster(team).map((data, index) => {
    const home = slotPoint(team, index, attack);
    return {
      id: `${team.id}-${data.number}`, teamId: team.id, index, data,
      x: home.x, y: home.y, homeX: home.x, homeY: home.y,
      vx: 0, vy: 0, facing: attack, cooldown: 0, selected: false
    };
  });
}

export function createMatch() {
  const players = [...makePlayers(TEAMS.china), ...makePlayers(TEAMS.capeVerde)];
  const starter = players.find(p => p.teamId === "china" && p.index === strikerIndex("china"));
  starter.selected = true;
  return {
    status: "ready", mode: "semi", time: MATCH_SECONDS, half: 1, score: { china: 0, capeVerde: 0 },
    players, ball: { x: CENTER.x, y: CENTER.y, vx: 0, vy: 0, ownerId: null, lastTeam: null },
    lastTouchTeamId: null,
    setPiece: null,
    officials: makeOfficials(),
    selectedId: starter.id, kickoffTeam: "china", firstKickoffTeam: "china",
    message: "点击“开球”开始", messageTimer: Infinity,
    goalReset: 0, halfReset: 0, setPieceReset: 0, winner: null,
    // Attack direction per team: +1 attacks the right goal, -1 the left. Swapped at half-time.
    sides: { china: 1, capeVerde: -1 },
    possessionTeam: null, counterPress: { teamId: null, timer: 0 }
  };
}

export function resetPositions(state, kickoffTeam = "china") {
  for (const player of state.players) {
    const attack = state.sides[player.teamId];
    const home = slotPoint(TEAMS[player.teamId], player.index, attack);
    player.x = player.homeX = home.x;
    player.y = player.homeY = home.y;
    player.vx = player.vy = 0;
    player.facing = attack;
  }
  const kicker = state.players.find(p => p.teamId === kickoffTeam && p.index === strikerIndex(kickoffTeam));
  kicker.x = CENTER.x - state.sides[kickoffTeam] * 22;
  kicker.y = CENTER.y;
  state.ball = { x: CENTER.x, y: CENTER.y, vx: 0, vy: 0, ownerId: kicker.id, lastTeam: kickoffTeam };
  trackTouch(state, kickoffTeam);
  state.kickoffTeam = kickoffTeam;
  state.possessionTeam = kickoffTeam;
  state.counterPress = { teamId: null, timer: 0 };
  state.setPiece = null;
  state.officials = makeOfficials();
}

export function startMatch(state) {
  state.time = MATCH_SECONDS;
  state.half = 1;
  state.halfReset = 0;
  state.score = { china: 0, capeVerde: 0 };
  state.status = "playing";
  state.winner = null;
  state.message = "开球！";
  state.messageTimer = 1.2;
  state.sides = { china: 1, capeVerde: -1 };
  state.firstKickoffTeam = "china";
  resetPositions(state, "china");
}

export function togglePause(state) {
  if (state.status === "playing") state.status = "paused";
  else if (state.status === "paused") state.status = "playing";
}

export const MODE_ORDER = ["semi", "manual", "auto"];
export const MODE_LABELS = { semi: "半自动", manual: "手动", auto: "全自动" };

export function modeLabel(mode) {
  return MODE_LABELS[mode] ?? MODE_LABELS.semi;
}

export function toggleMode(state) {
  const index = MODE_ORDER.indexOf(state.mode);
  state.mode = MODE_ORDER[(index + 1) % MODE_ORDER.length];
  state.message = `${modeLabel(state.mode)}模式`;
  state.messageTimer = 1.2;
}

function selected(state) {
  return state.players.find(p => p.id === state.selectedId);
}

export function selectNext(state) {
  if (state.mode === "auto") return;
  const china = state.players.filter(p => p.teamId === "china");
  let next;
  if (state.ball.ownerId) {
    const owner = state.players.find(p => p.id === state.ball.ownerId);
    if (owner?.teamId === "china") next = owner;
  }
  if (!next) {
    const current = china.findIndex(p => p.id === state.selectedId);
    next = china[(current + 1) % china.length];
  }
  for (const p of china) p.selected = p === next;
  state.selectedId = next.id;
}

function kick(state, player, speed, direction, options = {}) {
  const { receiver, kind = "pass" } = options;
  if (receiver && kind === "pass" && isOffsideAtPass(state, player, receiver)) {
    awardOffside(state, player, receiver);
    return;
  }
  state.ball.ownerId = null;
  state.ball.x = player.x + direction.x * 15;
  state.ball.y = player.y + direction.y * 15;
  state.ball.vx = direction.x * speed;
  state.ball.vy = direction.y * speed;
  trackTouch(state, player.teamId);
  player.cooldown = .28;
}

function isFoulTackle(defender, owner, attack) {
  const fromBehind = attack * (defender.x - owner.x) < -8;
  const ownerStill = Math.hypot(owner.vx, owner.vy) < 18;
  const reckless = defender.data.ratings.defense >= 8 && Math.random() < 0.22;
  return fromBehind || (ownerStill && reckless);
}

function penaltySpot(goalSide) {
  return {
    x: goalSide === "right" ? FIELD.right - PENALTY_MARK : FIELD.left + PENALTY_MARK,
    y: CENTER.y
  };
}

function awardFreeKick(state, fouledTeamId, spot) {
  startSetPiece(state, "freeKick", fouledTeamId, {
    x: clamp(spot.x, FIELD.left + 30, FIELD.right - 30),
    y: clamp(spot.y, FIELD.top + 20, FIELD.bottom - 20)
  });
}

function awardPenalty(state, fouledTeamId, goalSide, fouledPlayerId) {
  startSetPiece(state, "penaltyKick", fouledTeamId, penaltySpot(goalSide), {
    goalSide,
    fouledPlayerId,
    flagSide: goalSide === "right" ? "bottom" : "top"
  });
}

function resolveFoul(state, fouledTeamId, spot, fouledPlayerId) {
  const attack = state.sides[fouledTeamId];
  const goalSide = attack > 0 ? "right" : "left";
  if (inPenaltyArea(spot.x, spot.y, goalSide)) {
    awardPenalty(state, fouledTeamId, goalSide, fouledPlayerId);
  } else {
    awardFreeKick(state, fouledTeamId, spot);
  }
}

/** Receiver beyond the last outfield line and ahead of the ball when the pass is played. */
export function isOffsideAtPass(state, passer, receiver) {
  if (!passer || !receiver || passer.teamId !== receiver.teamId) return false;
  const attack = state.sides[passer.teamId];
  const inOppHalf = attack > 0 ? receiver.x > CENTER.x + 35 : receiver.x < CENTER.x - 35;
  if (!inOppHalf) return false;
  const lineX = defensiveLineX(state, passer.teamId, attack);
  if (attack > 0) {
    return receiver.x > lineX + OFFSIDE_TOLERANCE && receiver.x > passer.x + OFFSIDE_TOLERANCE;
  }
  return receiver.x < lineX - OFFSIDE_TOLERANCE && receiver.x < passer.x - OFFSIDE_TOLERANCE;
}

function awardOffside(state, passer, receiver) {
  const defendingTeam = oppositeTeam(passer.teamId);
  startSetPiece(state, "offside", defendingTeam, {
    x: clamp(receiver.x, FIELD.left + 30, FIELD.right - 30),
    y: clamp(receiver.y, FIELD.top + 20, FIELD.bottom - 20)
  }, { flagSide: receiver.y < CENTER.y ? "top" : "bottom" });
}

/** Small angular error on AI passes — weaker control sprays passes more. */
function withAimNoise(direction, control) {
  const angle = (Math.random() * 2 - 1) * (10 - control) * .012;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos };
}

/** AI pass: lead the receiver into space along their current run. */
function passTo(state, player, mate, speed) {
  const travel = clamp(dist(mate, player) / speed, 0, .6);
  const aimX = mate.x + mate.vx * travel * .8;
  const aimY = mate.y + mate.vy * travel * .8;
  const aim = withAimNoise(normalize(aimX - player.x, aimY - player.y), player.data.ratings.control);
  kick(state, player, speed, aim, { receiver: mate, kind: "pass" });
}

/** Is the player in the attacking third of the pitch? */
function inAttackingThird(player, attack) {
  const third = PITCH_W * .17;
  return attack > 0 ? player.x > CENTER.x + third : player.x < CENTER.x - third;
}

/**
 * Pick the best pass option: progression (weighted by the team's directness),
 * openness (pass into space away from opponents), and a switch-play bonus to
 * the far side when the carrier's zone is congested.
 */
function bestPassTarget(state, player) {
  const direction = state.sides[player.teamId];
  const tactics = tacticsOf(player);
  const forwardWeight = (inAttackingThird(player, direction) ? 1.5 : 1) * (.75 + tactics.directness * .5);
  const opponents = state.players.filter(p => p.teamId !== player.teamId);
  const crowd = opponents.filter(o => dist(o, player) < 150);
  const congestedSide = crowd.length >= 3
    ? Math.sign(crowd.reduce((sum, o) => sum + o.y - player.y, 0) || 1) : 0;
  const mates = state.players.filter(p => p.teamId === player.teamId && p.id !== player.id);
  const score = mate => {
    let value = direction * (mate.x - player.x) * forwardWeight - dist(mate, player) * .1;
    let nearest = Infinity;
    for (const o of opponents) { const d = dist(o, mate); if (d < nearest) nearest = d; }
    value += Math.min(nearest, 150) * .55;
    if (congestedSide && Math.sign(mate.y - player.y) === -congestedSide) value += 55;
    if (mate.index === 0) value -= 400;
    return value;
  };
  return mates.sort((a, b) => score(b) - score(a))[0];
}

/**
 * Clear scoring situation: within striking range of the goal and no opposing
 * outfielder goal-side near the shooting lane — i.e. one-on-one with the GK
 * or alone in front of goal. In this state the carrier must never pass back.
 */
function clearScoringChance(state, player, attack) {
  const goalX = attack > 0 ? FIELD.right : FIELD.left;
  if (Math.hypot(goalX - player.x, CENTER.y - player.y) > 420) return false;
  return !state.players.some(opponent => {
    if (opponent.teamId === player.teamId || opponent.index === 0) return false;
    if (attack * (opponent.x - player.x) < -12) return false;
    // Distance from the opponent to the carrier→goal-centre shooting lane.
    const lx = goalX - player.x, ly = CENTER.y - player.y;
    const t = clamp(((opponent.x - player.x) * lx + (opponent.y - player.y) * ly) / (lx * lx + ly * ly), 0, 1);
    return Math.hypot(opponent.x - (player.x + lx * t), opponent.y - (player.y + ly * t)) < 56;
  });
}

export function performAction(state, action, input = { x: 0, y: 0 }) {
  if (state.status === "setpiece") return performSetPieceAction(state, action, input);
  if (state.status !== "playing" || state.mode === "auto") return false;
  let player = selected(state);
  const owner = state.players.find(p => p.id === state.ball.ownerId);
  if (owner?.teamId === "china") player = owner;
  if (!player || player.cooldown > 0) return false;

  if (action === "pass" && owner?.id === player.id) {
    const target = bestPassTarget(state, player);
    const fieldForward = state.sides[player.teamId];
    const fallbackX = player.index === 0 ? fieldForward : player.facing;
    const aim = (state.mode === "semi" || player.index === 0) && target
      ? normalize(target.x - player.x, target.y - player.y)
      : normalize(input.x || fallbackX, input.y);
    kick(state, player, 380 + player.data.ratings.control * 11, aim, { receiver: target, kind: "pass" });
    return true;
  }
  if (action === "shoot" && owner?.id === player.id) {
    const attack = state.sides[player.teamId];
    const goalX = attack > 0 ? FIELD.right + 18 : FIELD.left - 18;
    const cornerY = clamp(CENTER.y + clamp(input.y, -1, 1) * 62, FIELD.goalTop + 16, FIELD.goalBottom - 16);
    const aim = state.mode === "semi"
      ? normalize(goalX - player.x, cornerY - player.y)
      : normalize(input.x || player.facing, input.y);
    kick(state, player, 520 + player.data.ratings.power * 15, aim, { kind: "shoot" });
    return true;
  }
  if ((action === "pass" || action === "tackle") && (!owner || owner.teamId !== "china") && dist(player, state.ball) < 36) {
    if (owner && owner.teamId !== "china") owner.cooldown = .55;
    state.ball.ownerId = player.id;
    trackTouch(state, "china");
    return true;
  }
  return false;
}

function moveToward(player, tx, ty, dt, multiplier = 1) {
  const dir = normalize(tx - player.x, ty - player.y);
  const max = (80 + player.data.ratings.speed * 8) * multiplier;
  player.vx += dir.x * max * dt * 6;
  player.vy += dir.y * max * dt * 6;
  const mag = Math.hypot(player.vx, player.vy);
  if (mag > max) { player.vx *= max / mag; player.vy *= max / mag; }
}

/** Max distance to goal at which a clear-chance carrier pulls the trigger. */
const CLEAR_SHOT_RANGE = 250;
/** Baseline vertical aim error (px) on every AI shot. */
const SHOT_ERROR_BASE = 40;
/** Extra aim error per px of distance to goal. */
const SHOT_ERROR_PER_DIST = 0.55;

/**
 * 射门精度: random vertical aim error for AI shots. Grows with distance and
 * shrinks with the shooter's shooting (power) rating, so strong finishers
 * still hit the corner more often while weaker ones spray shots wide or
 * straight at the keeper. Human-controlled shots are unaffected.
 */
function shotAimError(shooting, goalDist) {
  const scale = SHOT_ERROR_BASE + goalDist * SHOT_ERROR_PER_DIST;
  return (Math.random() * 2 - 1) * scale * (1.9 - shooting * 0.12);
}

/**
 * AI defender within reach tries to poke the ball off the carrier.
 * Chance scales with defender's defense vs carrier's control, so strong
 * attackers can still ride pressure and beat defenders.
 */
function tryTackle(state, player, owner, dt) {
  if (player.cooldown > 0 || owner.cooldown > 0 || owner.index === 0) return false;
  if (dist(player, owner) > 22) return false;
  const attack = state.sides[owner.teamId];
  if (isFoulTackle(player, owner, attack)) {
    resolveFoul(state, owner.teamId, { x: owner.x, y: owner.y }, owner.id);
    owner.cooldown = .55;
    player.cooldown = .35;
    return true;
  }
  const edge = player.data.ratings.defense - owner.data.ratings.control;
  if (Math.random() >= dt * Math.max(.2, 1.05 + edge * .18)) return false;
  owner.cooldown = .55;
  player.cooldown = .2;
  state.ball.ownerId = player.id;
  trackTouch(state, player.teamId);
  if (player.teamId === "china" && state.mode === "semi") {
    state.selectedId = player.id;
    state.players.filter(p => p.teamId === "china").forEach(p => { p.selected = p.id === state.selectedId; });
  }
  return true;
}

/** Deepest opposing outfielder toward this team's target goal (offside-line proxy). */
function defensiveLineX(state, teamId, attack) {
  let line = attack > 0 ? FIELD.left : FIELD.right;
  for (const p of state.players) {
    if (p.teamId === teamId || p.index === 0) continue;
    line = attack > 0 ? Math.max(line, p.x) : Math.min(line, p.x);
  }
  return clamp(line, FIELD.left + 90, FIELD.right - 90);
}

/**
 * Out-of-possession AI. Defensive jobs are assigned by distance rank to the
 * ball: 0 presses the carrier (逼抢), 1 covers goal-side or joins the press
 * when the team's pressing tactic is high (协防/双人逼抢), 2 screens the lane
 * to goal, players caught upfield sprint back (回追), the rest keep a compact
 * zonal block whose depth follows the team's defensive-line tactic (联防).
 * A counter-press window (就地反抢) whose intensity scales with the pressing
 * tactic makes everyone nearby swarm right after losing the ball.
 */
function updateDefenderAI(state, player, dt, owner, attack, ctx) {
  const ball = state.ball;
  const tactics = tacticsOf(player);
  const goalX = attack > 0 ? FIELD.left : FIELD.right;
  const rank = ctx.ranks.get(player.id);
  const defense = player.data.ratings.defense;
  const stamina = player.data.ratings.stamina;

  if (!owner) {
    if (rank <= 1) return moveToward(player, ball.x, ball.y, dt, 1.04 + defense * .01);
  } else {
    const counterPress = state.counterPress?.teamId === player.teamId && state.counterPress.timer > 0;
    if (counterPress && dist(player, owner) < 200 + tactics.pressing * 80) {
      if (tryTackle(state, player, owner, dt)) return;
      return moveToward(player, owner.x, owner.y, dt, 1 + defense * .025);
    }
    const inOwnHalf = attack > 0 ? ball.x < CENTER.x : ball.x > CENTER.x;
    // High-pressing teams commit a second presser, but only high up the pitch.
    if (rank === 0 || (rank === 1 && tactics.pressing > .5 && !inOwnHalf)) {
      if (tryTackle(state, player, owner, dt)) return;
      return moveToward(player, owner.x, owner.y, dt, (inOwnHalf ? 1.02 : .9 + tactics.pressing * .12) + defense * .02);
    }
    if (rank === 1) {
      const side = normalize(goalX - owner.x, CENTER.y - owner.y);
      return moveToward(player, owner.x + side.x * 58, owner.y + side.y * 38, dt, .95 + defense * .018);
    }
    if (rank === 2) {
      return moveToward(player, (owner.x + goalX) / 2, (owner.y + CENTER.y) / 2, dt, .92 + defense * .015);
    }
    const caughtUpfield = attack > 0 ? player.x > ball.x + 25 : player.x < ball.x - 25;
    if (caughtUpfield) {
      const backX = clamp(ball.x - attack * 65, FIELD.left + 25, FIELD.right - 25);
      return moveToward(player, backX, ball.y * .55 + player.homeY * .45, dt, .9 + stamina * .022);
    }
  }
  const depth = 30 + (1 - tactics.line) * 60;
  const zx = clamp(player.homeX - attack * depth + (ball.x - CENTER.x) * .24, FIELD.left + 20, FIELD.right - 20);
  const zy = clamp(player.homeY + (ball.y - CENTER.y) * .4, FIELD.top + 15, FIELD.bottom - 15);
  moveToward(player, zx, zy, dt, .92);
}

/**
 * In-possession off-ball movement by tactical role: strikers run the last
 * defender's shoulder (反越位前插), wingers hold width to stretch the block
 * (拉边), fullbacks overlap down the flank (套边), midfielders offer passing
 * triangles around the carrier (三角接应), centre-backs advance conservatively.
 */
function updateSupportAI(state, player, dt, owner, attack, ctx) {
  const ball = state.ball;
  const tactics = tacticsOf(player);
  const role = slotOf(player).role;
  let tx = player.homeX + attack * (60 + tactics.line * 40) + (ball.x - CENTER.x) * .25;
  let ty = player.homeY + (ball.y - CENTER.y) * .2;
  let pace = .9;
  if (role === "ST") {
    // Run the last defender's shoulder; stay in distinct lanes (4-4-2 twin strikers).
    tx = ctx.lineX[player.teamId] - attack * 14;
    ty = clamp(player.homeY + (ball.y - CENTER.y) * .12, FIELD.top + 30, FIELD.bottom - 30);
    const partner = state.players.find(p =>
      p.teamId === player.teamId && p.id !== player.id && slotOf(p).role === "ST"
    );
    if (partner) {
      const minSep = 120;
      const dy = ty - partner.y;
      if (Math.abs(dy) < minSep) {
        const laneSign = player.homeY < partner.homeY ? -1 : 1;
        ty = clamp(partner.y + laneSign * minSep, FIELD.top + 30, FIELD.bottom - 30);
      }
    }
    pace = .9 + tactics.directness * .14;
  } else if (role === "WG" || role === "WM") {
    const halfHeight = CENTER.y - FIELD.top - 30;
    ty = CENTER.y + Math.sign(player.homeY - CENTER.y) * halfHeight * (.55 + tactics.width * .45);
    tx = player.homeX + attack * (90 + tactics.line * 40) + (ball.x - CENTER.x) * .3;
    pace = .94;
  } else if (role === "FB") {
    const ballAhead = attack > 0 ? ball.x > CENTER.x : ball.x < CENTER.x;
    tx = ballAhead ? ball.x + attack * 40 : player.homeX + attack * 30;
    ty = player.homeY;
    pace = ballAhead ? .95 : .88;
  } else if ((role === "CM" || role === "DM") && owner && dist(owner, player) < 260) {
    const side = player.homeY > owner.y ? 1 : -1;
    tx = owner.x - attack * (role === "DM" ? 70 : 20);
    ty = owner.y + side * 85;
  } else if (role === "CB") {
    tx = player.homeX + attack * 45 + (ball.x - CENTER.x) * .3;
    ty = player.homeY + (ball.y - CENTER.y) * .15;
    pace = .85;
  }
  moveToward(player, clamp(tx, FIELD.left + 15, FIELD.right - 15), clamp(ty, FIELD.top + 15, FIELD.bottom - 15), dt, pace);
}

function updatePlayerAI(state, player, dt, ctx) {
  const ball = state.ball;
  const owner = state.players.find(p => p.id === ball.ownerId);
  const attack = state.sides[player.teamId];
  const ownPossession = owner?.teamId === player.teamId;

  if (player.index === 0) {
    const goalX = attack > 0 ? FIELD.left + 22 : FIELD.right - 22;
    const targetY = clamp(ball.y, FIELD.goalTop + 20, FIELD.goalBottom - 20);
    moveToward(player, goalX, targetY, dt, 1.05);
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    const reach = 19 + player.data.ratings.defense * 0.7;
    // Soft/medium balls can be held; driven shots (>~330 for elite GK) beat the keeper.
    const catchSpeed = 170 + player.data.ratings.defense * 18;
    if (!owner && player.cooldown <= 0 && dist(player, ball) < reach && ballSpeed < catchSpeed) {
      ball.ownerId = player.id;
      trackTouch(state, player.teamId);
      player.cooldown = 0.42;
    }
    if (ball.ownerId === player.id && player.cooldown <= 0) {
      passTo(state, player, bestPassTarget(state, player), 460);
    }
    return;
  }

  if (ball.ownerId === player.id) {
    const goalX = attack > 0 ? FIELD.right : FIELD.left;
    const goalDist = Math.hypot(goalX - player.x, CENTER.y - player.y);
    const clearChance = clearScoringChance(state, player, attack);
    const nearGoal = attack > 0 ? player.x > FIELD.right - 190 : player.x < FIELD.left + 190;
    const markers = state.players.filter(p => p.teamId !== player.teamId && dist(p, player) < 55);
    const dribble = () => {
      // Cut toward the goal mouth once deep; otherwise carry down the channel.
      const deep = attack > 0 ? player.x > FIELD.right - 300 : player.x < FIELD.left + 300;
      const ty = deep
        ? CENTER.y + (player.y - CENTER.y) * .55
        : clamp(player.homeY + (ball.y - CENTER.y) * .2, FIELD.top + 20, FIELD.bottom - 20);
      moveToward(player, player.x + attack * 110, ty, dt, 1 + (player.data.ratings.control - 7) * .02);
    };
    if (player.cooldown <= 0 && (nearGoal || (clearChance && goalDist < CLEAR_SHOT_RANGE))) {
      // Shot quality by distance: close finishes pick the corner away from the
      // keeper; longer strikes stay nearer the centre so the keeper can save.
      const keeper = state.players.find(p => p.teamId !== player.teamId && p.index === 0);
      const spread = goalDist < 160 ? 34 : 10;
      const cornerY = keeper && keeper.y > CENTER.y ? CENTER.y - spread : CENTER.y + spread;
      const aimY = cornerY + shotAimError(player.data.ratings.power, goalDist);
      const gx = attack > 0 ? FIELD.right + 15 : FIELD.left - 15;
      kick(state, player, 520 + player.data.ratings.power * 14, normalize(gx - player.x, aimY - player.y), { kind: "shoot" });
    } else if (clearChance) {
      // One-on-one with the keeper (or open goal): drive at goal, never pass back.
      moveToward(player, goalX - attack * 40, CENTER.y, dt, 1.04);
    } else if (markers.length > 0 && player.cooldown <= 0 && Math.random() < dt * 3) {
      const mate = bestPassTarget(state, player);
      const backward = attack * (mate.x - player.x) < -10;
      // In the attacking third a backward pass is only allowed under heavy pressure.
      if (backward && inAttackingThird(player, attack) && markers.length < 2) dribble();
      else passTo(state, player, mate, 400);
    } else dribble();
  } else if (ownPossession) {
    updateSupportAI(state, player, dt, owner, attack, ctx);
  } else {
    updateDefenderAI(state, player, dt, owner, attack, ctx);
  }
}

function updatePossession(state) {
  if (state.ball.ownerId) return;
  // First touch: better control secures the ball from slightly further away.
  const candidates = state.players
    .filter(p => p.cooldown <= 0 && dist(p, state.ball) < (p.index === 0 ? 28 : 13 + p.data.ratings.control * .8))
    .sort((a, b) => (b.data.ratings.control + Math.random() * 2) - (a.data.ratings.control + Math.random() * 2));
  if (candidates[0] && Math.hypot(state.ball.vx, state.ball.vy) < 300) {
    state.ball.ownerId = candidates[0].id;
    trackTouch(state, candidates[0].teamId);
    if (candidates[0].teamId === "china" && state.mode === "semi") {
      state.selectedId = candidates[0].id;
      state.players.filter(p => p.teamId === "china").forEach(p => { p.selected = p.id === state.selectedId; });
    }
  }
}

function nearestTeammate(state, player) {
  return state.players
    .filter(p => p.teamId === player.teamId && p.id !== player.id)
    .sort((a, b) => dist(a, player) - dist(b, player))[0];
}

function pickSetPieceTaker(state, teamId, type, spot, options = {}) {
  const teamPlayers = state.players.filter(p => p.teamId === teamId);
  if (type === "penaltyKick") {
    if (options.fouledPlayerId) {
      return teamPlayers.find(p => p.id === options.fouledPlayerId) ?? teamPlayers[0];
    }
    return teamPlayers.filter(p => p.index !== 0)
      .sort((a, b) => b.data.ratings.power - a.data.ratings.power)[0] ?? teamPlayers[0];
  }
  if (type === "offside") {
    return teamPlayers.filter(p => p.index !== 0)
      .sort((a, b) => dist(a, spot) - dist(b, spot))[0] ?? teamPlayers[0];
  }
  if (type === "goalKick") return teamPlayers.find(p => p.index === 0) ?? teamPlayers[0];
  if (type === "throwIn") {
    return teamPlayers.filter(p => p.index !== 0)
      .sort((a, b) => dist(a, spot) - dist(b, spot))[0] ?? teamPlayers[0];
  }
  return teamPlayers.filter(p => p.index !== 0)
    .sort((a, b) => {
      const roleBonus = role => (role === "WG" || role === "ST" ? -80 : 0);
      return dist(a, spot) + roleBonus(slotOf(a).role) - (dist(b, spot) + roleBonus(slotOf(b).role));
    })[0] ?? teamPlayers[0];
}

function positionPlayersForSetPiece(state) {
  const sp = state.setPiece;
  if (!sp) return;
  const { type, teamId, spot } = sp;
  const attack = state.sides[teamId];
  const goalX = attack > 0 ? FIELD.right : FIELD.left;

  for (const player of state.players) {
    player.vx = player.vy = 0;
    const home = slotPoint(TEAMS[player.teamId], player.index, state.sides[player.teamId]);
    if (player.id === sp.takerId) {
      player.x = spot.x;
      player.y = spot.y;
      player.facing = type === "throwIn"
        ? (spot.y <= FIELD.top + 10 ? 1 : -1)
        : attack;
      continue;
    }
    if (player.teamId === teamId) {
      if (type === "penaltyKick") {
        const markSide = sp.goalSide ?? (attack > 0 ? "right" : "left");
        const markX = markSide === "right" ? FIELD.right - PENALTY_MARK : FIELD.left + PENALTY_MARK;
        player.x = clamp(markX - attack * (55 + player.index * 5), FIELD.left + 40, FIELD.right - 40);
        player.y = clamp(CENTER.y + (player.homeY - CENTER.y) * .45, FIELD.top + 30, FIELD.bottom - 30);
      } else if (type === "cornerKick") {
        player.x = clamp(goalX - attack * (70 + player.index * 6), FIELD.left + 40, FIELD.right - 40);
        player.y = clamp(CENTER.y + (player.homeY - CENTER.y) * .55, FIELD.top + 30, FIELD.bottom - 30);
      } else if (type === "goalKick") {
        player.x = clamp(home.x, FIELD.left + 70, FIELD.right - 70);
        player.y = home.y;
      } else if (type === "freeKick" || type === "offside") {
        player.x = clamp(spot.x + attack * (35 + player.index * 4), FIELD.left + 20, FIELD.right - 20);
        player.y = clamp(spot.y + (player.homeY - CENTER.y) * .35, FIELD.top + 20, FIELD.bottom - 20);
      } else {
        player.x = clamp(spot.x + attack * 55, FIELD.left + 30, FIELD.right - 30);
        player.y = clamp(spot.y + (player.homeY - CENTER.y) * .45, FIELD.top + 20, FIELD.bottom - 20);
      }
    } else if (type === "penaltyKick") {
      const markSide = sp.goalSide ?? (attack > 0 ? "right" : "left");
      const goalLineX = markSide === "right" ? FIELD.right : FIELD.left;
      if (player.index === 0) {
        player.x = goalLineX + (markSide === "right" ? -22 : 22);
        player.y = CENTER.y;
      } else {
        const outsideX = markSide === "right" ? FIELD.right - 168 - 36 : FIELD.left + 168 + 36;
        player.x = clamp(outsideX + (player.index - 5) * 8, FIELD.left + 30, FIELD.right - 30);
        player.y = clamp(player.homeY + (player.index - 5) * 10, FIELD.top + 25, FIELD.bottom - 25);
      }
    } else if ((type === "freeKick" || type === "offside") && dist(player, spot) < 130) {
      player.x = spot.x - attack * 40;
      player.y = clamp(spot.y + (player.index - 5) * 13, FIELD.top + 20, FIELD.bottom - 20);
    } else if (type === "cornerKick") {
      player.x = clamp(goalX - attack * 28, FIELD.left + 20, FIELD.right - 20);
      player.y = clamp(CENTER.y + (player.homeY - CENTER.y) * .65, FIELD.top + 20, FIELD.bottom - 20);
    } else {
      player.x = home.x;
      player.y = home.y;
    }
  }
}

function raiseAssistantFlag(state, side) {
  const ref = side === "top" || side === "bottom"
    ? (state.ball.x < CENTER.x ? state.officials.arLeft : state.officials.arRight)
    : state.officials.arLeft;
  ref.flag = true;
  ref.flagTimer = 2.2;
}

function startSetPiece(state, type, teamId, spot, options = {}) {
  state.status = "setpiece";
  state.setPieceReset = 0;
  state.counterPress = { teamId: null, timer: 0 };
  const taker = pickSetPieceTaker(state, teamId, type, spot, options);
  state.setPiece = {
    type, teamId, spot, takerId: taker.id,
    readyTimer: 0.6, aiDelay: 0.35 + Math.random() * 0.45, kicked: false,
    goalSide: options.goalSide ?? null,
    fouledPlayerId: options.fouledPlayerId ?? null
  };
  state.message = RESTART_LABELS[type] ?? type;
  state.messageTimer = 2;
  state.ball.ownerId = null;
  state.ball.vx = state.ball.vy = 0;
  state.ball.x = spot.x;
  state.ball.y = spot.y;
  positionPlayersForSetPiece(state);
  state.ball.ownerId = taker.id;
  trackTouch(state, teamId);
  if (options.flagSide) raiseAssistantFlag(state, options.flagSide);
  if (teamId === "china" && state.mode !== "auto") {
    state.selectedId = taker.id;
    state.players.filter(p => p.teamId === "china").forEach(p => { p.selected = p.id === taker.id; });
  }
}

function resolveOutOfPlay(state) {
  const ball = state.ball;
  const lastTouch = touchTeamForRestart(state);
  const inGoalMouth = ball.y > FIELD.goalTop && ball.y < FIELD.goalBottom;

  if (ball.y <= FIELD.top || ball.y >= FIELD.bottom) {
    const side = ball.y <= FIELD.top ? "top" : "bottom";
    startSetPiece(state, "throwIn", oppositeTeam(lastTouch), {
      x: clamp(ball.x, FIELD.left + 20, FIELD.right - 20),
      y: side === "top" ? FIELD.top + 4 : FIELD.bottom - 4
    }, { flagSide: side });
    return true;
  }

  if (ball.x <= FIELD.left && !inGoalMouth) {
    const attackers = teamAttackingGoal(state, "left");
    const restartTeam = lastTouch === attackers
      ? teamDefendingGoal(state, "left")
      : attackers;
    const type = lastTouch === attackers ? "goalKick" : "cornerKick";
    const spot = type === "goalKick"
      ? { x: FIELD.left + GOAL_AREA.depth - 10, y: clamp(ball.y, CENTER.y - GOAL_AREA.halfHeight + 20, CENTER.y + GOAL_AREA.halfHeight - 20) }
      : { x: FIELD.left + CORNER_INSET, y: ball.y < CENTER.y ? FIELD.top + CORNER_INSET : FIELD.bottom - CORNER_INSET };
    startSetPiece(state, type, restartTeam, spot, { flagSide: ball.y < CENTER.y ? "top" : "bottom" });
    return true;
  }

  if (ball.x >= FIELD.right && !inGoalMouth) {
    const attackers = teamAttackingGoal(state, "right");
    const restartTeam = lastTouch === attackers
      ? teamDefendingGoal(state, "right")
      : attackers;
    const type = lastTouch === attackers ? "goalKick" : "cornerKick";
    const spot = type === "goalKick"
      ? { x: FIELD.right - GOAL_AREA.depth + 10, y: clamp(ball.y, CENTER.y - GOAL_AREA.halfHeight + 20, CENTER.y + GOAL_AREA.halfHeight - 20) }
      : { x: FIELD.right - CORNER_INSET, y: ball.y < CENTER.y ? FIELD.top + CORNER_INSET : FIELD.bottom - CORNER_INSET };
    startSetPiece(state, type, restartTeam, spot, { flagSide: ball.y < CENTER.y ? "top" : "bottom" });
    return true;
  }
  return false;
}

function executeSetPieceKick(state, player, input = { x: 0, y: 0 }) {
  const sp = state.setPiece;
  if (!sp || sp.kicked || player.id !== sp.takerId) return false;
  const attack = state.sides[player.teamId];
  sp.kicked = true;
  state.setPieceReset = 0;

  if (sp.type === "throwIn") {
    const mate = nearestTeammate(state, player);
    const dir = mate
      ? normalize(mate.x - player.x, mate.y - player.y)
      : normalize(attack, (Math.random() - 0.5) * 0.35);
    kick(state, player, 320, dir, { receiver: mate, kind: "pass" });
  } else if (sp.type === "goalKick") {
    const mate = state.players.filter(p => p.teamId === player.teamId && p.index !== 0)
      .sort((a, b) => attack * (b.x - a.x) - attack * (a.x - b.x))[0];
    const target = mate ?? player;
    kick(state, player, 440, normalize(target.x - player.x, target.y - player.y), { receiver: mate, kind: "pass" });
  } else if (sp.type === "cornerKick") {
    const goalX = attack > 0 ? FIELD.right : FIELD.left;
    const aimY = CENTER.y + (Math.random() - 0.5) * 110;
    kick(state, player, 380, normalize(goalX - player.x, aimY - player.y), { kind: "shoot" });
  } else if (sp.type === "penaltyKick") {
    const markSide = sp.goalSide ?? (attack > 0 ? "right" : "left");
    const goalX = markSide === "right" ? FIELD.right + 15 : FIELD.left - 15;
    const aimY = CENTER.y + (Math.random() - 0.5) * 48;
    const dir = (sp.teamId === "china" && state.mode !== "auto" && Math.hypot(input.x, input.y) > 0.2)
      ? normalize(input.x, input.y)
      : normalize(goalX - player.x, aimY - player.y);
    kick(state, player, 560 + player.data.ratings.power * 14, dir, { kind: "shoot" });
  } else if (sp.type === "offside") {
    const mate = nearestTeammate(state, player);
    if (mate) passTo(state, player, mate, 300);
    else kick(state, player, 300, normalize(attack, 0), { kind: "pass" });
  } else if (sp.type === "freeKick") {
    const goalX = attack > 0 ? FIELD.right : FIELD.left;
    const goalDist = Math.abs(goalX - player.x);
    if (goalDist < 280 && (sp.teamId !== "china" || state.mode === "auto" || Math.hypot(input.x, input.y) < 0.2)) {
      const aimY = CENTER.y + (Math.random() - 0.5) * 70;
      kick(state, player, 500 + player.data.ratings.power * 12, normalize(goalX - player.x + attack * 18, aimY - player.y), { kind: "shoot" });
    } else {
      const mate = bestPassTarget(state, player) ?? nearestTeammate(state, player);
      if (mate) passTo(state, player, mate, 360);
      else kick(state, player, 360, normalize(attack, 0), { kind: "pass" });
    }
  }
  return true;
}

function performSetPieceAction(state, action, input) {
  if (state.mode === "auto") return false;
  const sp = state.setPiece;
  if (!sp || sp.kicked || sp.readyTimer > 0) return false;
  const taker = state.players.find(p => p.id === sp.takerId);
  if (!taker || taker.cooldown > 0 || sp.teamId !== "china") return false;
  if (action === "pass" || (action === "shoot" && (sp.type === "freeKick" || sp.type === "penaltyKick"))) {
    return executeSetPieceKick(state, taker, input);
  }
  return false;
}

function resumeFromSetPiece(state) {
  state.status = "playing";
  state.setPiece = null;
  state.officials.arLeft.flag = false;
  state.officials.arRight.flag = false;
}

function updateSetPiece(state, dt, input) {
  const sp = state.setPiece;
  if (!sp) { state.status = "playing"; return; }

  sp.readyTimer = Math.max(0, sp.readyTimer - dt);
  updateOfficials(state, dt);

  const taker = state.players.find(p => p.id === sp.takerId);
  if (taker && !sp.kicked) {
    taker.x = sp.spot.x;
    taker.y = sp.spot.y;
    state.ball.x = taker.x + taker.facing * 10;
    state.ball.y = taker.y + 3;
    state.ball.ownerId = taker.id;
  }

  if (sp.kicked) {
    state.setPieceReset += dt;
    updateBall(state, dt);
    updatePossession(state);
    if (state.status === "goal") {
      state.setPiece = null;
      return;
    }
    if (state.status === "setpiece" && (state.ball.ownerId || state.setPieceReset > 0.9)) {
      resumeFromSetPiece(state);
    }
    return;
  }

  if (sp.readyTimer <= 0) {
    sp.aiDelay -= dt;
    if ((sp.teamId !== "china" || state.mode === "auto") && sp.aiDelay <= 0 && taker) {
      executeSetPieceKick(state, taker, input);
    }
  }

  for (const player of state.players) {
    if (player.id !== sp.takerId) {
      player.vx *= Math.pow(.01, dt);
      player.vy *= Math.pow(.01, dt);
    }
  }
}

export function updateOfficials(state, dt) {
  const targetY = clamp(state.ball.y, FIELD.top + 24, FIELD.bottom - 24);
  const blend = Math.min(1, dt * 3.2);
  state.officials.arLeft.y += (targetY - state.officials.arLeft.y) * blend;
  state.officials.arRight.y += (targetY - state.officials.arRight.y) * blend;
  for (const ref of [state.officials.arLeft, state.officials.arRight]) {
    if (ref.flagTimer > 0) {
      ref.flagTimer = Math.max(0, ref.flagTimer - dt);
      if (ref.flagTimer <= 0) ref.flag = false;
    }
  }
}

function inPenaltyArea(x, y, goalSide) {
  if (goalSide === "left") {
    return x <= FIELD.left + 168 && y >= CENTER.y - 160 && y <= CENTER.y + 160;
  }
  return x >= FIELD.right - 168 && y >= CENTER.y - 160 && y <= CENTER.y + 160;
}

function goal(state, teamId) {
  state.score[teamId] += 1;
  state.status = "goal";
  state.goalReset = 1.8;
  state.message = teamId === "china" ? "中国女足进球！" : "蓝鲨进球！";
  state.messageTimer = 1.8;
  state.ball.ownerId = null;
  state.ball.vx = state.ball.vy = 0;
  state.kickoffTeam = teamId === "china" ? "capeVerde" : "china";
  state.setPiece = null;
}

function updateBall(state, dt) {
  const ball = state.ball;
  const owner = state.players.find(p => p.id === ball.ownerId);
  if (owner) {
    if (owner.index === 0) {
      owner.facing = state.sides[owner.teamId];
      const defendedSide = state.sides[owner.teamId] > 0 ? "left" : "right";
      if (!inPenaltyArea(owner.x, owner.y, defendedSide)) {
        awardFreeKick(state, oppositeTeam(owner.teamId), { x: owner.x, y: owner.y });
        ball.ownerId = null;
        return;
      }
    }
    ball.x = owner.x + owner.facing * 12;
    ball.y = owner.y + 4;
    return;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  const friction = Math.pow(.15, dt);
  ball.vx *= friction; ball.vy *= friction;

  const inGoalMouth = ball.y > FIELD.goalTop && ball.y < FIELD.goalBottom;
  const attacksRight = state.sides.china > 0 ? "china" : "capeVerde";
  const attacksLeft = state.sides.china > 0 ? "capeVerde" : "china";
  if (ball.x > FIELD.right && inGoalMouth) return goal(state, attacksRight);
  if (ball.x < FIELD.left && inGoalMouth) return goal(state, attacksLeft);

  const out = ball.y <= FIELD.top || ball.y >= FIELD.bottom
    || ball.x <= FIELD.left || ball.x >= FIELD.right;
  if (out && (state.status === "playing" || (state.status === "setpiece" && state.setPiece?.kicked))) {
    resolveOutOfPlay(state);
    return;
  }
}

/** Per-frame shared AI context: defensive distance ranks + offside-line proxies. */
function buildFrameContext(state) {
  const ctx = {
    ranks: new Map(),
    lineX: {
      china: defensiveLineX(state, "china", state.sides.china),
      capeVerde: defensiveLineX(state, "capeVerde", state.sides.capeVerde)
    }
  };
  for (const teamId of ["china", "capeVerde"]) {
    state.players
      .filter(p => p.teamId === teamId && p.index !== 0)
      .sort((a, b) => dist(a, state.ball) - dist(b, state.ball))
      .forEach((p, i) => ctx.ranks.set(p.id, i));
  }
  return ctx;
}

export function updateMatch(state, dt, input = { x: 0, y: 0 }) {
  dt = Math.min(dt, .04);
  if (state.messageTimer !== Infinity) state.messageTimer = Math.max(0, state.messageTimer - dt);
  if (state.status === "goal") {
    state.goalReset -= dt;
    if (state.goalReset <= 0) { resetPositions(state, state.kickoffTeam); state.status = "playing"; }
    return;
  }
  if (state.status === "halftime") {
    state.halfReset -= dt;
    if (state.halfReset <= 0) {
      state.status = "playing";
      state.message = "下半场开始！";
      state.messageTimer = 1.4;
      resetPositions(state, state.kickoffTeam);
    }
    return;
  }
  if (state.status === "setpiece") {
    updateSetPiece(state, dt, input);
    return;
  }
  if (state.status !== "playing") return;
  state.time = Math.max(0, state.time - dt);
  if (state.half === 1 && state.time <= HALF_SECONDS) {
    state.half = 2;
    state.time = HALF_SECONDS;
    state.status = "halftime";
    state.halfReset = HALF_TIME_PAUSE;
    state.message = "中场休息 · 交换场地";
    state.messageTimer = HALF_TIME_PAUSE;
    state.ball.ownerId = null;
    state.ball.vx = state.ball.vy = 0;
    // Teams swap ends; the team that didn't take the first kickoff starts the second half.
    state.sides = { china: -state.sides.china, capeVerde: -state.sides.capeVerde };
    state.kickoffTeam = state.firstKickoffTeam === "china" ? "capeVerde" : "china";
    return;
  }
  if (state.time <= 0) {
    state.status = "ended";
    state.winner = state.score.china === state.score.capeVerde ? "draw" : (state.score.china > state.score.capeVerde ? "china" : "capeVerde");
    state.message = state.winner === "draw" ? "比赛结束 · 平局" : state.winner === "china" ? "比赛结束 · 中国女足胜" : "比赛结束 · 蓝鲨胜";
    state.messageTimer = Infinity;
    return;
  }

  const ctx = buildFrameContext(state);
  const controlled = selected(state);
  for (const player of state.players) {
    player.cooldown = Math.max(0, player.cooldown - dt);
    const isManual = state.mode !== "auto" && player.id === controlled?.id
      && (state.mode === "manual" || (state.mode === "semi" && state.ball.ownerId === player.id));
    if (isManual && Math.hypot(input.x, input.y) > .08) {
      const speed = 88 + player.data.ratings.speed * 9;
      player.vx = input.x * speed; player.vy = input.y * speed;
    } else updatePlayerAI(state, player, dt, ctx);
    player.x = clamp(player.x + player.vx * dt, FIELD.left + 9, FIELD.right - 9);
    player.y = clamp(player.y + player.vy * dt, FIELD.top + 9, FIELD.bottom - 9);
    player.vx *= Math.pow(.04, dt); player.vy *= Math.pow(.04, dt);
    if (Math.abs(player.vx) > 4) player.facing = Math.sign(player.vx);
  }
  if (state.status !== "playing") return;
  updateBall(state, dt);
  if (state.status === "setpiece") return;
  updatePossession(state);
  updateOfficials(state, dt);
  const holder = state.players.find(p => p.id === state.ball.ownerId);
  if (holder) {
    if (state.possessionTeam && state.possessionTeam !== holder.teamId) {
      const tactics = TEAMS[state.possessionTeam].tactics;
      // Counter-press duration scales with the team's pressing intensity.
      state.counterPress = { teamId: state.possessionTeam, timer: 1.8 + tactics.pressing * 1.5 };
    }
    state.possessionTeam = holder.teamId;
  }
  if (state.counterPress.timer > 0) state.counterPress.timer = Math.max(0, state.counterPress.timer - dt);
}

/**
 * Map remaining real seconds to football match minutes.
 * Formula: matchMinutes = elapsedRealSeconds / MATCH_SECONDS * MATCH_DISPLAY_MINUTES
 * with elapsedRealSeconds = MATCH_SECONDS - remainingSeconds.
 */
export function matchMinutesFromRemaining(remainingSeconds) {
  const elapsed = Math.max(0, MATCH_SECONDS - Math.max(0, remainingSeconds));
  return Math.min(MATCH_DISPLAY_MINUTES, (elapsed / MATCH_SECONDS) * MATCH_DISPLAY_MINUTES);
}

/** HUD clock: football match minutes as `0'` … `90'`. */
export function formatTime(remainingSeconds) {
  if (remainingSeconds <= 0) return `${MATCH_DISPLAY_MINUTES}'`;
  return `${Math.floor(matchMinutesFromRemaining(remainingSeconds))}'`;
}
