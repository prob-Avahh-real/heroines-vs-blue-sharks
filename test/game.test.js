import { describe, expect, it, vi } from "vitest";
import {
  CENTER, FIELD, RESTART_LABELS, createMatch, formatTime, isOffsideAtPass, matchMinutesFromRemaining, modeLabel, performAction,
  resetPositions, selectNext, startMatch, strikerIndex, toggleMode, togglePause, updateMatch, updateOfficials
} from "../src/game.js";
import {
  ACTIVE_COUNT, HALF_SECONDS, MATCH_DISPLAY_MINUTES, MATCH_SECONDS, TEAMS, activeRoster
} from "../src/data/teams.js";

describe("match lifecycle", () => {
  it("starts a five-minute 11v11 match with China taking kickoff", () => {
    const state = createMatch();
    startMatch(state);
    expect(state.status).toBe("playing");
    expect(MATCH_SECONDS).toBe(300);
    expect(state.time).toBe(MATCH_SECONDS);
    expect(state.half).toBe(1);
    expect(ACTIVE_COUNT).toBe(11);
    expect(state.players).toHaveLength(22);
    const owner = state.players.find(player => player.id === state.ball.ownerId);
    expect(owner.teamId).toBe("china");
  });

  it("supports pause and cycles through all control modes", () => {
    const state = createMatch();
    startMatch(state);
    togglePause(state);
    expect(state.status).toBe("paused");
    togglePause(state);
    expect(state.mode).toBe("semi");
    expect(modeLabel(state.mode)).toBe("半自动");
    toggleMode(state);
    expect(state.status).toBe("playing");
    expect(state.mode).toBe("manual");
    expect(modeLabel(state.mode)).toBe("手动");
    toggleMode(state);
    expect(state.mode).toBe("auto");
    expect(modeLabel(state.mode)).toBe("全自动");
    toggleMode(state);
    expect(state.mode).toBe("semi");
  });

  it("runs full-auto as a spectator mode with AI progressing play", () => {
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const owner = state.players.find(player => player.id === state.ball.ownerId);
    const startX = owner.x;
    const startY = owner.y;
    const startBallX = state.ball.x;

    expect(performAction(state, "pass", { x: 1, y: 0 })).toBe(false);
    expect(performAction(state, "shoot", { x: 1, y: 0 })).toBe(false);
    expect(state.ball.ownerId).toBe(owner.id);

    const beforeId = state.selectedId;
    selectNext(state);
    expect(state.selectedId).toBe(beforeId);

    for (let frame = 0; frame < 180; frame += 1) {
      updateMatch(state, 0.016, { x: 1, y: 0 });
    }

    const stillOwner = state.players.find(player => player.id === state.ball.ownerId);
    const ballMoved = Math.abs(state.ball.x - startBallX) > 5 || state.ball.ownerId !== owner.id;
    const holderMoved = stillOwner
      ? Math.hypot(stillOwner.x - startX, stillOwner.y - startY) > 2
      : true;
    expect(ballMoved || holderMoved).toBe(true);
    // AI pressing can force turnovers and even a quick goal; both mean play progressed.
    expect(["playing", "goal", "setpiece"]).toContain(state.status);
  });

  it("ignores stick input on the controlled china player in full-auto", () => {
    // Deterministic: no random AI passes or tackle rolls during this check.
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const player = state.players.find(p => p.id === state.selectedId);
    player.x = 500;
    player.y = CENTER.y;
    player.vx = player.vy = 0;
    state.ball.ownerId = player.id;
    const startX = player.x;
    for (let frame = 0; frame < 40; frame += 1) {
      updateMatch(state, 0.016, { x: -1, y: 0 });
    }
    // AI dribbles forward (right for China), not left with the stick.
    expect(player.x).toBeGreaterThanOrEqual(startX - 2);
    rand.mockRestore();
  });

  it("passes the ball and releases possession", () => {
    const state = createMatch();
    startMatch(state);
    const owner = state.players.find(player => player.id === state.ball.ownerId);
    state.selectedId = owner.id;
    expect(performAction(state, "pass", { x: 1, y: 0 })).toBe(true);
    expect(state.ball.ownerId).toBeNull();
    // Kickoff taker is the most advanced player, so the assisted pass rolls
    // back toward a teammate — it just has to leave the foot with pace.
    expect(Math.hypot(state.ball.vx, state.ball.vy)).toBeGreaterThan(200);
    expect(state.ball.lastTeam).toBe("china");
  });

  it("lets the goalkeeper distribute the ball in both control modes", () => {
    const gk = (state) => state.players.find(player => player.teamId === "china" && player.index === 0);

    for (const mode of ["semi", "manual"]) {
      const state = createMatch();
      startMatch(state);
      state.mode = mode;
      const keeper = gk(state);
      keeper.x = 80;
      keeper.y = CENTER.y;
      keeper.facing = -1;
      keeper.cooldown = 0;
      state.ball.ownerId = keeper.id;
      state.ball.lastTeam = "china";
      state.selectedId = keeper.id;
      state.players.filter(player => player.teamId === "china").forEach(player => {
        player.selected = player.id === keeper.id;
      });

      expect(performAction(state, "pass", { x: 0, y: 0 })).toBe(true);
      expect(state.ball.ownerId).toBeNull();
      expect(state.ball.vx).toBeGreaterThan(0);

      for (let frame = 0; frame < 20; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
      expect(state.ball.ownerId).not.toBe(keeper.id);
      expect(state.ball.x).toBeGreaterThan(keeper.x + 40);
    }
  });

  it("awards goals at either end and schedules the other team kickoff", () => {
    const state = createMatch();
    startMatch(state);
    state.ball.ownerId = null;
    state.ball.x = FIELD.right + 4;
    state.ball.y = CENTER.y;
    state.ball.vx = 100;
    updateMatch(state, .02);
    expect(state.score.china).toBe(1);
    expect(state.status).toBe("goal");
    expect(state.kickoffTeam).toBe("capeVerde");
  });

  it("scores when a soft shot rolls across the goal line in the mouth", () => {
    const state = createMatch();
    startMatch(state);
    for (const player of state.players) {
      player.x = 200;
      player.y = 60;
      player.homeX = 200;
      player.homeY = 60;
      player.vx = player.vy = 0;
    }
    state.ball.ownerId = null;
    state.ball.x = FIELD.right - 30;
    state.ball.y = CENTER.y;
    state.ball.vx = 120;
    state.ball.vy = 0;
    let scored = false;
    for (let frame = 0; frame < 120; frame += 1) {
      updateMatch(state, 0.016, { x: 0, y: 0 });
      if (state.status === "goal") {
        scored = true;
        break;
      }
    }
    expect(scored).toBe(true);
    expect(state.score.china).toBe(1);
  });

  it("awards a goal kick when a wide shot crosses the goal line off the attacker", () => {
    const state = createMatch();
    startMatch(state);
    for (const player of state.players) {
      player.x = 200;
      player.y = 60;
      player.homeX = 200;
      player.homeY = 60;
      player.vx = player.vy = 0;
    }
    state.ball.ownerId = null;
    state.ball.x = FIELD.right - 4;
    state.ball.y = FIELD.goalTop - 80;
    state.ball.vx = 220;
    state.ball.vy = 0;
    state.lastTouchTeamId = "china";
    for (let frame = 0; frame < 20; frame += 1) {
      updateMatch(state, 0.016, { x: 0, y: 0 });
      if (state.status === "setpiece") break;
    }
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("goalKick");
    expect(state.setPiece.teamId).toBe("capeVerde");
    expect(state.message).toBe("门球");
  });

  it("lets firm shots from the box beat the keeper in both control modes", () => {
    for (const mode of ["semi", "manual"]) {
      const state = createMatch();
      startMatch(state);
      state.mode = mode;
      const strikerIdx = strikerIndex("china");
      for (const player of state.players) {
        if (!(player.teamId === "china" && player.index === strikerIdx) && !(player.teamId === "capeVerde" && player.index === 0)) {
          player.x = 220;
          player.y = 70;
          player.homeX = 220;
          player.homeY = 70;
        }
      }
      const striker = state.players.find(player => player.teamId === "china" && player.index === strikerIdx);
      const keeper = state.players.find(player => player.teamId === "capeVerde" && player.index === 0);
      striker.x = FIELD.right - 180;
      striker.y = CENTER.y;
      striker.facing = 1;
      striker.cooldown = 0;
      keeper.x = FIELD.right - 22;
      keeper.y = CENTER.y;
      state.selectedId = striker.id;
      state.players.filter(player => player.teamId === "china").forEach(player => {
        player.selected = player.id === striker.id;
      });
      state.ball.ownerId = striker.id;
      const input = mode === "semi" ? { x: 0, y: -1 } : { x: 1, y: -0.3 };
      expect(performAction(state, "shoot", input)).toBe(true);
      let scored = false;
      for (let frame = 0; frame < 150; frame += 1) {
        updateMatch(state, 0.016, { x: 0, y: 0 });
        if (state.status === "goal") {
          scored = true;
          break;
        }
      }
      expect(scored).toBe(true);
      expect(state.score.china).toBe(1);
    }
  });

  it("pauses briefly at half-time then starts the second half", () => {
    const state = createMatch();
    startMatch(state);
    state.time = HALF_SECONDS + 0.01;
    updateMatch(state, 0.02);
    expect(state.status).toBe("halftime");
    expect(state.half).toBe(2);
    expect(state.time).toBe(HALF_SECONDS);
    expect(formatTime(state.time)).toBe("45'");
    while (state.status === "halftime") updateMatch(state, 0.04);
    expect(state.status).toBe("playing");
    expect(state.half).toBe(2);
  });

  it("ends on time at 90' and identifies a winner", () => {
    const state = createMatch();
    startMatch(state);
    state.half = 2;
    state.score.china = 2;
    state.time = .01;
    updateMatch(state, .02);
    expect(state.status).toBe("ended");
    expect(state.winner).toBe("china");
    expect(formatTime(0)).toBe("90'");
  });

  it("resets every player inside the pitch", () => {
    const state = createMatch();
    state.players.forEach(player => { player.x = -500; player.y = 900; });
    resetPositions(state, "capeVerde");
    expect(state.players.every(player =>
      player.x > FIELD.left && player.x < FIELD.right && player.y > FIELD.top && player.y < FIELD.bottom
    )).toBe(true);
  });
});

describe("formations and tactics", () => {
  it("spawns 11 players per side in their real formations", () => {
    const state = createMatch();
    startMatch(state);
    for (const teamId of ["china", "capeVerde"]) {
      expect(state.players.filter(p => p.teamId === teamId)).toHaveLength(11);
    }
    expect(TEAMS.china.formation.name).toBe("4-4-2");
    expect(TEAMS.capeVerde.formation.name).toBe("4-3-3");
  });

  it("encodes the 4-4-2 and 4-3-3 shapes in the formation slots", () => {
    const count = (team, roles) =>
      team.formation.slots.filter(slot => roles.includes(slot.role)).length;
    // China 4-4-2: back four, four midfielders, two strikers.
    expect(count(TEAMS.china, ["GK"])).toBe(1);
    expect(count(TEAMS.china, ["FB", "CB"])).toBe(4);
    expect(count(TEAMS.china, ["WM", "CM", "DM"])).toBe(4);
    expect(count(TEAMS.china, ["ST", "WG"])).toBe(2);
    // Cape Verde 4-3-3: back four, midfield three, front three.
    expect(count(TEAMS.capeVerde, ["GK"])).toBe(1);
    expect(count(TEAMS.capeVerde, ["FB", "CB"])).toBe(4);
    expect(count(TEAMS.capeVerde, ["DM", "CM"])).toBe(3);
    expect(count(TEAMS.capeVerde, ["WG", "ST"])).toBe(3);
  });

  it("lines players up on their own half mirroring the formation", () => {
    const state = createMatch();
    startMatch(state);
    for (const player of state.players) {
      const inOwnHalf = state.sides[player.teamId] > 0
        ? player.homeX <= CENTER.x + 1
        : player.homeX >= CENTER.x - 1;
      expect(inOwnHalf).toBe(true);
    }
    // Back line sits deeper than the forwards for both teams.
    const gk = state.players.find(p => p.teamId === "capeVerde" && p.index === 0);
    const st = state.players.find(p => p.teamId === "capeVerde" && p.index === strikerIndex("capeVerde"));
    expect(gk.homeX).toBeGreaterThan(st.homeX);
  });

  it("defines bounded team tactic profiles used by the AI", () => {
    for (const team of Object.values(TEAMS)) {
      const { pressing, line, width, directness } = team.tactics;
      for (const value of [pressing, line, width, directness]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
    // China defends deeper and presses less than Cape Verde (低位防反 vs 高压快攻).
    expect(TEAMS.china.tactics.pressing).toBeLessThan(TEAMS.capeVerde.tactics.pressing);
    expect(TEAMS.china.tactics.line).toBeLessThanOrEqual(TEAMS.capeVerde.tactics.line);
  });

  it("holds width with wingers when Cape Verde attacks (拉边)", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "capeVerde" && p.index === strikerIndex("capeVerde"));
    carrier.x = CENTER.x - 100;
    carrier.y = CENTER.y;
    carrier.cooldown = 9;
    state.ball.ownerId = carrier.id;
    state.ball.lastTeam = "capeVerde";
    state.possessionTeam = "capeVerde";
    const wingers = state.players.filter(p => p.teamId === "capeVerde"
      && TEAMS.capeVerde.formation.slots[p.index].role === "WG");
    for (let frame = 0; frame < 90; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
    // One winger near each touchline, well apart vertically.
    const ys = wingers.map(w => w.y).sort((a, b) => a - b);
    expect(ys[0]).toBeLessThan(CENTER.y - 150);
    expect(ys[1]).toBeGreaterThan(CENTER.y + 150);
    rand.mockRestore();
  });

  it("pushes strikers up to the defensive line when in possession (前插)", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "china" && p.index === 6);
    carrier.x = CENTER.x;
    carrier.y = CENTER.y;
    carrier.cooldown = 9;
    state.ball.ownerId = carrier.id;
    state.ball.lastTeam = "china";
    state.possessionTeam = "china";
    const striker = state.players.find(p => p.teamId === "china" && p.index === strikerIndex("china"));
    const startX = striker.x;
    for (let frame = 0; frame < 90; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
    expect(striker.x).toBeGreaterThan(startX + 60);
    rand.mockRestore();
  });

  it("keeps 4-4-2 strikers separated when attacking (双前锋拉开)", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "china" && p.index === 6);
    carrier.x = CENTER.x + 80;
    carrier.y = CENTER.y;
    carrier.cooldown = 9;
    state.ball.ownerId = carrier.id;
    state.ball.lastTeam = "china";
    state.possessionTeam = "china";
    const strikers = state.players.filter(p => p.teamId === "china"
      && TEAMS.china.formation.slots[p.index].role === "ST");
    for (let frame = 0; frame < 90; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
    const ys = strikers.map(s => s.y).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(100);
    rand.mockRestore();
  });
});

describe("defensive AI", () => {
  const step = (state, frames) => {
    for (let frame = 0; frame < frames; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
  };
  const distanceTo = (player, target) => Math.hypot(player.x - target.x, player.y - target.y);

  it("converges nearby china defenders on an opponent ball carrier (联防/协防/逼抢)", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "capeVerde" && p.index === 7);
    carrier.x = 360;
    carrier.y = 300;
    carrier.cooldown = 9;
    state.ball.ownerId = carrier.id;
    state.ball.lastTeam = "capeVerde";
    state.possessionTeam = "capeVerde";
    const outfield = state.players.filter(p => p.teamId === "china" && p.index !== 0);
    const before = outfield.map(p => distanceTo(p, carrier));
    step(state, 60);
    const after = outfield.map(p => distanceTo(p, carrier));
    // Presser plus at least one cover defender end up tight on the carrier.
    expect(after.filter(d => d < 120).length).toBeGreaterThanOrEqual(2);
    const mean = values => values.reduce((sum, d) => sum + d, 0) / values.length;
    expect(mean(after)).toBeLessThan(mean(before));
    rand.mockRestore();
  });

  it("counter-presses right after losing possession (就地反抢)", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    step(state, 1);
    expect(state.possessionTeam).toBe("china");
    const thief = state.players.find(p => p.teamId === "capeVerde" && p.index === 6);
    thief.x = CENTER.x - 80;
    thief.y = CENTER.y - 40;
    thief.cooldown = 9;
    state.ball.ownerId = thief.id;
    state.ball.lastTeam = "capeVerde";
    step(state, 1);
    expect(state.counterPress.teamId).toBe("china");
    expect(state.counterPress.timer).toBeGreaterThan(1.5);
    const swarmers = state.players.filter(p => p.teamId === "china" && p.index !== 0 && distanceTo(p, thief) < 220);
    expect(swarmers.length).toBeGreaterThanOrEqual(2);
    const before = swarmers.map(p => distanceTo(p, thief));
    step(state, 30);
    const closer = swarmers.filter((p, i) => distanceTo(p, thief) < before[i]);
    expect(closer.length).toBeGreaterThanOrEqual(Math.min(3, swarmers.length));
    expect(state.counterPress.timer).toBeGreaterThan(0);
    rand.mockRestore();
  });

  it("tracks forwards back goal-side on an opponent advance (回追)", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "capeVerde" && p.index === 7);
    carrier.x = 340;
    carrier.y = CENTER.y;
    carrier.cooldown = 9;
    state.ball.ownerId = carrier.id;
    state.ball.lastTeam = "capeVerde";
    state.possessionTeam = "capeVerde";
    const striker = state.players.find(p => p.teamId === "china" && p.index === strikerIndex("china"));
    striker.x = 880;
    striker.y = CENTER.y;
    striker.vx = striker.vy = 0;
    const startX = striker.x;
    step(state, 50);
    // Caught upfield with the ball behind them, forwards sprint back toward goal.
    expect(striker.x).toBeLessThan(startX - 40);
    rand.mockRestore();
  });
});

describe("attacking AI", () => {
  const step = (state, frames) => {
    for (let frame = 0; frame < frames; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
  };

  /** Striker one-on-one: mates behind, opponent outfielders out of the lane. */
  function setupOneOnOne(strikerX, strikerY = CENTER.y) {
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const strikerIdx = strikerIndex("china");
    for (const player of state.players) {
      if (player.teamId === "china" && player.index !== strikerIdx) {
        player.x = player.homeX = 360;
        player.y = player.homeY = 70 + player.index * 50;
      }
      if (player.teamId === "capeVerde" && player.index !== 0) {
        player.x = player.homeX = 240;
        player.y = player.homeY = 70 + player.index * 50;
        player.cooldown = 9;
      }
      player.vx = player.vy = 0;
    }
    const striker = state.players.find(p => p.teamId === "china" && p.index === strikerIdx);
    striker.x = strikerX;
    striker.y = strikerY;
    striker.cooldown = 0;
    const keeper = state.players.find(p => p.teamId === "capeVerde" && p.index === 0);
    keeper.x = FIELD.right - 22;
    keeper.y = CENTER.y;
    state.ball.ownerId = striker.id;
    state.ball.lastTeam = "china";
    state.possessionTeam = "china";
    return { state, striker };
  }

  it("shoots immediately when one-on-one with the keeper in range", () => {
    // random=0.5 → zero shot aim error, so the strike is deterministic.
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { state } = setupOneOnOne(FIELD.right - 220);
    step(state, 1);
    // First touch is a forward shot at goal, never a backward pass.
    expect(state.ball.ownerId).toBeNull();
    expect(state.ball.vx).toBeGreaterThan(300);
    rand.mockRestore();
  });

  it("drives at goal and finishes instead of passing back when clean through from distance", () => {
    // 0.5 suppresses random passes/tackles and gives zero shot aim error.
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { state, striker } = setupOneOnOne(FIELD.right - 540);
    const startX = striker.x;
    let shotVx = null;
    for (let frame = 0; frame < 400 && shotVx === null; frame += 1) {
      updateMatch(state, 0.016, { x: 0, y: 0 });
      if (!state.ball.ownerId && Math.hypot(state.ball.vx, state.ball.vy) > 100) shotVx = state.ball.vx;
    }
    expect(striker.x).toBeGreaterThan(startX + 40);
    expect(shotVx).toBeGreaterThan(300);
    rand.mockRestore();
  });

  it("refuses a backward pass in the attacking third under light pressure", () => {
    // random=0 makes the old pressured-pass branch fire on the very first frame.
    const rand = vi.spyOn(Math, "random").mockReturnValue(0);
    const strikerX = FIELD.right - 330;
    const { state, striker } = setupOneOnOne(strikerX);
    // Block the shooting lane so it is not a clear chance, and add one marker behind.
    const blocker = state.players.find(p => p.teamId === "capeVerde" && p.index === 3);
    blocker.x = strikerX + 100;
    blocker.y = CENTER.y;
    const marker = state.players.find(p => p.teamId === "capeVerde" && p.index === 4);
    marker.x = strikerX;
    marker.y = CENTER.y + 40;
    step(state, 10);
    // Mates are all backward: the carrier keeps the ball and dribbles on instead.
    expect(state.ball.ownerId).toBe(striker.id);
    expect(striker.x).toBeGreaterThanOrEqual(strikerX);
    rand.mockRestore();
  });
});

describe("half-time side swap", () => {
  const runUntilSecondHalf = state => {
    state.time = HALF_SECONDS + 0.01;
    updateMatch(state, 0.02);
    expect(state.status).toBe("halftime");
    for (let frame = 0; frame < 80 && state.status !== "playing"; frame += 1) updateMatch(state, 0.04);
    expect(state.status).toBe("playing");
  };

  it("swaps attack directions and hands kickoff to the other team", () => {
    const state = createMatch();
    startMatch(state);
    expect(state.sides).toEqual({ china: 1, capeVerde: -1 });
    runUntilSecondHalf(state);
    expect(state.sides).toEqual({ china: -1, capeVerde: 1 });
    expect(state.kickoffTeam).toBe("capeVerde");
    const owner = state.players.find(p => p.id === state.ball.ownerId);
    expect(owner.teamId).toBe("capeVerde");
    // Keepers now guard the opposite goals.
    const chinaGk = state.players.find(p => p.teamId === "china" && p.index === 0);
    const capeVerdeGk = state.players.find(p => p.teamId === "capeVerde" && p.index === 0);
    expect(chinaGk.x).toBeGreaterThan(CENTER.x);
    expect(capeVerdeGk.x).toBeLessThan(CENTER.x);
    expect(chinaGk.homeX).toBeGreaterThan(CENTER.x);
  });

  it("credits second-half goals to the team attacking the swapped end", () => {
    const state = createMatch();
    startMatch(state);
    runUntilSecondHalf(state);
    // China attacks the left goal in the second half.
    state.ball.ownerId = null;
    state.ball.x = FIELD.left + 6;
    state.ball.y = CENTER.y;
    state.ball.vx = -400;
    state.ball.vy = 0;
    let scored = false;
    for (let frame = 0; frame < 30 && !scored; frame += 1) {
      updateMatch(state, 0.016, { x: 0, y: 0 });
      if (state.status === "goal") scored = true;
    }
    expect(scored).toBe(true);
    expect(state.score.china).toBe(1);
    expect(state.score.capeVerde).toBe(0);
    expect(state.kickoffTeam).toBe("capeVerde");
  });

  it("keeps play running after the swap (全自动 second half progresses)", () => {
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    runUntilSecondHalf(state);
    const startBallX = state.ball.x;
    for (let frame = 0; frame < 200; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
    expect(["playing", "goal", "setpiece"]).toContain(state.status);
    const moved = Math.abs(state.ball.x - startBallX) > 5 || state.ball.ownerId !== null;
    expect(moved).toBe(true);
  });
});

describe("set pieces and out-of-play", () => {
  it("awards a throw-in to the team that did not last touch on the touchline", () => {
    const state = createMatch();
    startMatch(state);
    state.ball.ownerId = null;
    state.ball.x = 600;
    state.ball.y = FIELD.top - 2;
    state.ball.vx = 0;
    state.ball.vy = -80;
    state.lastTouchTeamId = "china";
    updateMatch(state, 0.02, { x: 0, y: 0 });
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("throwIn");
    expect(state.setPiece.teamId).toBe("capeVerde");
    expect(state.message).toBe(RESTART_LABELS.throwIn);
  });

  it("awards a corner when the defender last touches over the goal line", () => {
    const state = createMatch();
    startMatch(state);
    state.ball.ownerId = null;
    state.ball.x = FIELD.right + 2;
    state.ball.y = FIELD.goalTop - 40;
    state.ball.vx = 120;
    state.lastTouchTeamId = "capeVerde";
    updateMatch(state, 0.02, { x: 0, y: 0 });
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("cornerKick");
    expect(state.setPiece.teamId).toBe("china");
    expect(state.message).toBe("角球");
  });

  it("awards a free kick on a reckless tackle from behind", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "china" && p.index === 7);
    const tackler = state.players.find(p => p.teamId === "capeVerde" && p.index === 4);
    for (const player of state.players) {
      if (player !== carrier && player !== tackler) {
        player.x = player.y = 120;
        player.vx = player.vy = 0;
        player.cooldown = 9;
      }
    }
    carrier.x = 500;
    carrier.y = CENTER.y;
    carrier.vx = carrier.vy = 0;
    carrier.cooldown = 0;
    tackler.x = carrier.x - 14;
    tackler.y = carrier.y;
    tackler.vx = tackler.vy = 0;
    tackler.cooldown = 0;
    state.ball.ownerId = carrier.id;
    trackTouchHelper(state, "china");
    updateMatch(state, 0.05, { x: 0, y: 0 });
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("freeKick");
    expect(state.setPiece.teamId).toBe("china");
    expect(state.message).toBe("任意球");
    rand.mockRestore();
  });

  function trackTouchHelper(state, teamId) {
    state.lastTouchTeamId = teamId;
    state.ball.lastTeam = teamId;
  }
});

describe("penalty kicks", () => {
  const step = (state, frames) => {
    for (let frame = 0; frame < frames; frame += 1) updateMatch(state, 0.016, { x: 0, y: 0 });
  };

  it("awards a penalty when a defender fouls an attacker inside the box", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    const carrier = state.players.find(p => p.teamId === "capeVerde" && p.index === strikerIndex("capeVerde"));
    const tackler = state.players.find(p => p.teamId === "china" && p.index === 4);
    for (const player of state.players) {
      if (player !== carrier && player !== tackler) {
        player.x = player.y = 900;
        player.vx = player.vy = 0;
        player.cooldown = 9;
      }
    }
    carrier.x = FIELD.left + 90;
    carrier.y = CENTER.y;
    carrier.vx = carrier.vy = 0;
    carrier.cooldown = 0;
    tackler.x = carrier.x + 14;
    tackler.y = carrier.y;
    tackler.vx = tackler.vy = 0;
    tackler.cooldown = 0;
    state.ball.ownerId = carrier.id;
    state.lastTouchTeamId = "capeVerde";
    updateMatch(state, 0.05, { x: 0, y: 0 });
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("penaltyKick");
    expect(state.setPiece.teamId).toBe("capeVerde");
    expect(state.message).toBe("点球");
    expect(state.setPiece.spot.x).toBeCloseTo(FIELD.left + 108, 0);
    const keeper = state.players.find(p => p.teamId === "china" && p.index === 0);
    expect(keeper.x).toBeCloseTo(FIELD.left + 22, 0);
    rand.mockRestore();
  });

  it("converts a penalty into a goal", () => {
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const state = createMatch();
    startMatch(state);
    state.mode = "auto";
    for (const player of state.players) {
      player.x = 200;
      player.y = 60 + player.index * 8;
      player.vx = player.vy = 0;
      player.cooldown = 0;
    }
    const striker = state.players.find(p => p.teamId === "china" && p.index === strikerIndex("china"));
    const keeper = state.players.find(p => p.teamId === "capeVerde" && p.index === 0);
    striker.x = FIELD.right - 108;
    striker.y = CENTER.y;
    keeper.x = FIELD.right - 22;
    keeper.y = CENTER.y + 80;
    state.status = "setpiece";
    state.setPiece = {
      type: "penaltyKick",
      teamId: "china",
      spot: { x: FIELD.right - 108, y: CENTER.y },
      takerId: striker.id,
      goalSide: "right",
      readyTimer: 0,
      aiDelay: 0,
      kicked: false
    };
    state.ball.ownerId = striker.id;
    state.ball.x = striker.x;
    state.ball.y = striker.y;
    striker.selected = true;
    state.selectedId = striker.id;
    let scored = false;
    for (let frame = 0; frame < 120 && !scored; frame += 1) {
      updateMatch(state, 0.016, { x: 0, y: 0 });
      if (state.status === "goal") scored = true;
    }
    expect(scored).toBe(true);
    expect(state.score.china).toBe(1);
    rand.mockRestore();
  });

  it("awards a goal kick when a penalty misses wide", () => {
    const state = createMatch();
    startMatch(state);
    state.ball.ownerId = null;
    state.ball.x = FIELD.right - 2;
    state.ball.y = FIELD.goalTop - 70;
    state.ball.vx = 240;
    state.ball.vy = 0;
    state.lastTouchTeamId = "china";
    updateMatch(state, 0.02, { x: 0, y: 0 });
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("goalKick");
    expect(state.setPiece.teamId).toBe("capeVerde");
    expect(state.message).toBe("门球");
  });
});

describe("offside", () => {
  it("flags offside on a through pass beyond the last defender", () => {
    const state = createMatch();
    startMatch(state);
    const passer = state.players.find(p => p.teamId === "china" && p.index === 6);
    const striker = state.players.find(p => p.teamId === "china" && p.index === strikerIndex("china"));
    const lastDef = state.players.filter(p => p.teamId === "capeVerde" && p.index !== 0)
      .sort((a, b) => b.x - a.x)[0];
    for (const player of state.players) {
      if (player.teamId === "capeVerde" && player.index !== 0 && player !== lastDef) {
        player.x = 200;
        player.y = 80 + player.index * 10;
      } else if (player !== passer && player !== striker && player !== lastDef) {
        player.x = 200;
        player.y = 80 + player.index * 10;
      }
      player.vx = player.vy = 0;
      player.cooldown = 0;
    }
    lastDef.x = FIELD.right - 260;
    lastDef.y = CENTER.y;
    striker.x = FIELD.right - 210;
    striker.y = CENTER.y;
    passer.x = FIELD.right - 360;
    passer.y = CENTER.y;
    state.ball.ownerId = passer.id;
    state.selectedId = passer.id;
    state.players.filter(p => p.teamId === "china").forEach(p => { p.selected = p.id === passer.id; });
    expect(isOffsideAtPass(state, passer, striker)).toBe(true);
    expect(performAction(state, "pass", { x: 1, y: 0 })).toBe(true);
    expect(state.status).toBe("setpiece");
    expect(state.setPiece.type).toBe("offside");
    expect(state.setPiece.teamId).toBe("capeVerde");
    expect(state.message).toBe("越位");
    expect(state.officials.arLeft.flag || state.officials.arRight.flag).toBe(true);
  });

  it("allows a through ball level with the last defender", () => {
    const state = createMatch();
    startMatch(state);
    const passer = state.players.find(p => p.teamId === "china" && p.index === 6);
    const striker = state.players.find(p => p.teamId === "china" && p.index === strikerIndex("china"));
    const lastDef = state.players.filter(p => p.teamId === "capeVerde" && p.index !== 0)
      .sort((a, b) => b.x - a.x)[0];
    for (const player of state.players) {
      if (player.teamId === "capeVerde" && player.index !== 0 && player !== lastDef) {
        player.x = 200;
      }
    }
    lastDef.x = FIELD.right - 240;
    striker.x = FIELD.right - 230;
    passer.x = FIELD.right - 400;
    for (const p of [passer, striker, lastDef]) {
      p.y = CENTER.y;
      p.vx = p.vy = 0;
      p.cooldown = 0;
    }
    state.ball.ownerId = passer.id;
    expect(isOffsideAtPass(state, passer, striker)).toBe(false);
    expect(performAction(state, "pass", { x: 1, y: 0 })).toBe(true);
    expect(state.status).toBe("playing");
    expect(state.ball.ownerId).toBeNull();
  });
});

describe("assistant referees", () => {
  it("tracks the ball Y along both touchlines with lag", () => {
    const state = createMatch();
    startMatch(state);
    state.officials.arLeft.y = CENTER.y;
    state.officials.arRight.y = CENTER.y;
    state.ball.y = FIELD.bottom - 40;
    updateOfficials(state, 0.2);
    expect(state.officials.arLeft.y).toBeGreaterThan(CENTER.y);
    expect(state.officials.arLeft.y).toBeLessThan(FIELD.bottom - 40);
    expect(state.officials.arRight.y).toBe(state.officials.arLeft.y);
  });

  it("raises a flag on touchline out-of-play", () => {
    const state = createMatch();
    startMatch(state);
    state.ball.ownerId = null;
    state.ball.x = 700;
    state.ball.y = FIELD.bottom + 4;
    state.lastTouchTeamId = "capeVerde";
    updateMatch(state, 0.02, { x: 0, y: 0 });
    expect(state.status).toBe("setpiece");
    expect(state.officials.arLeft.flag || state.officials.arRight.flag).toBe(true);
  });
});

describe("data and display helpers", () => {
  it("provides complete active lineups and bounded game ratings", () => {
    for (const team of Object.values(TEAMS)) {
      expect(activeRoster(team)).toHaveLength(ACTIVE_COUNT);
      expect(team.formation.slots).toHaveLength(ACTIVE_COUNT);
      for (const player of team.roster) {
        for (const rating of Object.values(player.ratings)) expect(rating).toBeGreaterThanOrEqual(1);
        for (const rating of Object.values(player.ratings)) expect(rating).toBeLessThanOrEqual(10);
      }
    }
  });

  it("maps real elapsed seconds onto 0–90 match minutes", () => {
    expect(MATCH_SECONDS).toBe(300);
    expect(MATCH_DISPLAY_MINUTES).toBe(90);
    expect(matchMinutesFromRemaining(MATCH_SECONDS)).toBe(0);
    expect(matchMinutesFromRemaining(HALF_SECONDS)).toBe(45);
    expect(matchMinutesFromRemaining(0)).toBe(90);
    // 1 real second ≈ 0.3 match minutes
    expect(matchMinutesFromRemaining(MATCH_SECONDS - 1)).toBeCloseTo(0.3, 5);
    // mid second half: 225 elapsed real seconds → 67.5'
    expect(matchMinutesFromRemaining(75)).toBeCloseTo(67.5, 5);
  });

  it("formats the football match clock", () => {
    expect(formatTime(MATCH_SECONDS)).toBe("0'");
    expect(formatTime(HALF_SECONDS)).toBe("45'");
    expect(formatTime(75)).toBe("67'");
    expect(formatTime(0)).toBe("90'");
  });
});
