import { createInput } from "./input.js";
import {
  createMatch, formatTime, modeLabel, performAction, selectNext, startMatch,
  toggleMode, togglePause, updateMatch
} from "./game.js";
import { render } from "./render.js";

const $ = id => document.getElementById(id);
const canvas = $("pitch");
const ctx = canvas.getContext("2d");
const state = createMatch();
const input = createInput($("stick"), $("knob"));
let last = performance.now();
let elapsed = 0;

function action(name) {
  const vector = input.vector();
  performAction(state, name, vector);
}

function bindPress(id, handler) {
  $(id).addEventListener("pointerdown", event => { event.preventDefault(); handler(); });
}

bindPress("pass", () => action("pass"));
bindPress("shoot", () => action("shoot"));
bindPress("switch", () => selectNext(state));
bindPress("mode", () => toggleMode(state));
bindPress("pause", () => togglePause(state));
bindPress("restart", () => startMatch(state));

$("help").addEventListener("click", () => $("helpDialog").showModal());
$("closeHelp").addEventListener("click", () => $("helpDialog").close());
$("sensor").addEventListener("click", async () => {
  try {
    await input.enableSensors(() => action("pass"));
    $("sensor").classList.add("active");
    $("sensor").textContent = "⌚ 体感中";
    state.message = "体感控制已启用";
    state.messageTimer = 1.6;
  } catch (error) {
    state.message = error.message || "无法启用体感";
    state.messageTimer = 2;
  }
});

addEventListener("keydown", event => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === " " || key === "spacebar" || key === "j") action("pass");
  if (key === "k") action("shoot");
  if (key === "l") selectNext(state);
  if (key === "p") togglePause(state);
  if (key === "m") toggleMode(state);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.status === "playing") togglePause(state);
});

function updateUI() {
  $("score").textContent = `${state.score.china} — ${state.score.capeVerde}`;
  $("clock").textContent = formatTime(state.time);
  $("mode").textContent = `模式：${modeLabel(state.mode)}`;
  $("pause").textContent = state.status === "paused" ? "继续" : "暂停";
  const visible = state.messageTimer > 0 || ["ready", "paused", "ended", "halftime", "setpiece"].includes(state.status);
  $("banner").classList.toggle("hidden", !visible);
  $("banner").textContent = state.status === "paused" ? "已暂停" : state.message;
}

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  elapsed += Math.min(dt, .05);
  updateMatch(state, dt, input.vector());
  render(ctx, state, elapsed);
  updateUI();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
