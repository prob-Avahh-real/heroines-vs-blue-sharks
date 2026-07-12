import { CENTER, FIELD } from "./game.js";
import { TEAMS } from "./data/teams.js";

const px = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

function drawPitch(ctx) {
  const width = FIELD.right - FIELD.left;
  px(ctx, "#163f31", 0, 0, 1280, 720);
  for (let i = 0; i < 10; i++) px(ctx, i % 2 ? "#2a8f4d" : "#268348", FIELD.left + i * (width / 10), FIELD.top, width / 10 + 1, FIELD.bottom - FIELD.top);
  ctx.strokeStyle = "#d9efc9"; ctx.lineWidth = 3; ctx.globalAlpha = .9;
  ctx.strokeRect(FIELD.left, FIELD.top, width, FIELD.bottom - FIELD.top);
  ctx.beginPath(); ctx.moveTo(CENTER.x, FIELD.top); ctx.lineTo(CENTER.x, FIELD.bottom); ctx.stroke();
  ctx.beginPath(); ctx.arc(CENTER.x, CENTER.y, 86, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#d9efc9"; ctx.fillRect(CENTER.x - 3, CENTER.y - 3, 6, 6);
  ctx.strokeRect(FIELD.left, CENTER.y - 160, 168, 320); ctx.strokeRect(FIELD.right - 168, CENTER.y - 160, 168, 320);
  ctx.strokeRect(FIELD.left, CENTER.y - 79, 64, 158); ctx.strokeRect(FIELD.right - 64, CENTER.y - 79, 64, 158);
  ctx.globalAlpha = 1;
  drawGoal(ctx, FIELD.left - 32, FIELD.goalTop, 32, FIELD.goalBottom - FIELD.goalTop);
  drawGoal(ctx, FIELD.right, FIELD.goalTop, 32, FIELD.goalBottom - FIELD.goalTop);
}

function drawGoal(ctx, x, y, w, h) {
  px(ctx, "#e9f1e9", x, y, w, 4); px(ctx, "#e9f1e9", x, y + h - 4, w, 4); px(ctx, "#e9f1e9", x, y, 4, h);
  ctx.strokeStyle = "#a9c9bd"; ctx.lineWidth = 1;
  for (let yy = y + 10; yy < y + h; yy += 10) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  for (let xx = x + 8; xx < x + w; xx += 8) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
}

function drawHair(ctx, player, x, y, s) {
  const { hair, hairColor } = player.data.visual;
  if (hair === "bald") return px(ctx, "#4d2b1c", x - 4 * s, y - 8 * s, 8 * s, 2 * s);
  px(ctx, hairColor, x - 5 * s, y - 10 * s, 10 * s, 5 * s);
  if (hair === "ponytail") { px(ctx, hairColor, x + 4 * s, y - 7 * s, 5 * s, 4 * s); px(ctx, hairColor, x + 7 * s, y - 3 * s, 3 * s, 5 * s); }
  if (hair === "bun") px(ctx, hairColor, x + 2 * s, y - 13 * s, 6 * s, 5 * s);
  if (hair === "bob") { px(ctx, hairColor, x - 7 * s, y - 8 * s, 3 * s, 10 * s); px(ctx, hairColor, x + 4 * s, y - 8 * s, 3 * s, 10 * s); }
  if (hair === "fade") px(ctx, hairColor, x - 3 * s, y - 12 * s, 7 * s, 3 * s);
  if (hair === "locs") for (let i = -5; i <= 5; i += 5) px(ctx, hairColor, x + i * s, y - 7 * s, 3 * s, 8 * s);
}

function drawPlayer(ctx, player, time) {
  const team = TEAMS[player.teamId];
  const s = player.data.visual.height;
  const bob = Math.abs(player.vx) + Math.abs(player.vy) > 8 ? Math.round(Math.sin(time * 14 + player.index) * 2) : 0;
  const x = player.x, y = player.y + bob;
  px(ctx, "#0c1c1a55", x - 11, y + 14, 23, 7);
  if (player.selected) {
    ctx.fillStyle = "#ffe66d"; ctx.beginPath(); ctx.moveTo(x, y - 24 * s); ctx.lineTo(x - 6, y - 32 * s); ctx.lineTo(x + 6, y - 32 * s); ctx.fill();
    ctx.strokeStyle = "#fff29a"; ctx.lineWidth = 2; ctx.strokeRect(Math.round(x - 12), Math.round(y - 18), 24, 39);
  }
  const leg = Math.sin(time * 15 + player.index) * Math.min(3, Math.abs(player.vx + player.vy) / 40);
  px(ctx, team.colors.skin, x - 8 * s + leg, y + 8 * s, 5 * s, 10 * s);
  px(ctx, team.colors.skin, x + 3 * s - leg, y + 8 * s, 5 * s, 10 * s);
  px(ctx, team.colors.socks, x - 8 * s + leg, y + 12 * s, 5 * s, 6 * s);
  px(ctx, team.colors.socks, x + 3 * s - leg, y + 12 * s, 5 * s, 6 * s);
  px(ctx, "#101820", x - 9 * s + leg, y + 17 * s, 7 * s, 3 * s);
  px(ctx, "#101820", x + 2 * s - leg, y + 17 * s, 7 * s, 3 * s);
  px(ctx, team.colors.shorts, x - 9 * s, y + 3 * s, 18 * s, 8 * s);
  px(ctx, team.colors.shirt, x - 10 * s, y - 8 * s, 20 * s, 14 * s);
  px(ctx, team.colors.trim, x - 10 * s, y - 8 * s, 3 * s, 12 * s);
  px(ctx, team.colors.trim, x + 7 * s, y - 8 * s, 3 * s, 12 * s);
  px(ctx, team.colors.skin, x - 5 * s, y - 14 * s, 10 * s, 8 * s);
  drawHair(ctx, player, x, y, s);
  ctx.font = `bold ${Math.round(9 * s)}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = team.colors.trim; ctx.fillText(player.data.number, Math.round(x), Math.round(y - 1));
  if (player.selected || player.id === this?.hovered) {
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(player.data.name, x, y + 29);
  }
}

function drawOfficial(ctx, x, y, kind, time, flag = false) {
  const bob = Math.sin(time * 8 + x * 0.02) * (kind === "assistant" ? 1.8 : 1.2);
  px(ctx, "#0c1c1a55", x - 9, y + 12, 18, 5);
  px(ctx, "#20232a", x - 7, y + 2 + bob, 6, 12); px(ctx, "#20232a", x + 1, y + 2 - bob, 6, 12);
  px(ctx, "#171a20", x - 9, y - 8, 18, 13); px(ctx, "#eecc45", x - 9, y - 8, 18, 3);
  px(ctx, "#a86440", x - 5, y - 15, 10, 8); px(ctx, "#251711", x - 6, y - 18, 12, 5);
  px(ctx, "#251711", x + 4, y - 16, 5, 7); // ponytail: all officials are women
  if (kind === "assistant") {
    const flagY = y - 6 - Math.abs(Math.sin(time * 9)) * 4;
    px(ctx, "#e7e8df", x + 8, y - 4, 2, 12);
    px(ctx, "#e34a3f", x + 10, flag ? flagY - 10 : y - 2, flag ? 14 : 12, flag ? 10 : 8);
    px(ctx, "#f4d84a", x + 10, flag ? flagY - 10 : y - 2, flag ? 7 : 6, flag ? 5 : 4);
  }
}

function drawBall(ctx, ball, time) {
  px(ctx, "#0c1c1a66", ball.x - 6, ball.y + 5, 13, 5);
  const lift = Math.min(4, Math.hypot(ball.vx, ball.vy) / 130);
  px(ctx, "#f8f3de", ball.x - 6, ball.y - 6 - lift, 12, 12);
  px(ctx, "#17212a", ball.x - 2, ball.y - 2 - lift, 4, 4);
  px(ctx, "#17212a", ball.x - 6, ball.y - 5 - lift, 3, 3);
  px(ctx, "#17212a", ball.x + 3, ball.y + 2 - lift, 3, 3);
}

export function render(ctx, state, elapsed) {
  ctx.imageSmoothingEnabled = false;
  drawPitch(ctx);
  const officials = state.officials ?? { arLeft: { y: CENTER.y }, arRight: { y: CENTER.y } };
  drawOfficial(ctx, CENTER.x + Math.sin(elapsed * .5) * 55, CENTER.y + 30, "referee", elapsed);
  drawOfficial(ctx, FIELD.left - 16, officials.arLeft.y, "assistant", elapsed, officials.arLeft.flag);
  drawOfficial(ctx, FIELD.right + 16, officials.arRight.y, "assistant", elapsed, officials.arRight.flag);
  const ordered = [...state.players].sort((a, b) => a.y - b.y);
  for (const player of ordered) drawPlayer(ctx, player, elapsed);
  drawBall(ctx, state.ball, elapsed);
}
