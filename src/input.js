export function createInput(stick, knob) {
  const state = { x: 0, y: 0, sensor: false };
  const keys = new Set();
  let pointerId = null;

  function setStick(clientX, clientY) {
    const rect = stick.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const radius = rect.width * .34;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    state.x = (dx * scale) / radius;
    state.y = (dy * scale) / radius;
    knob.style.transform = `translate(${state.x * radius}px, ${state.y * radius}px)`;
  }
  function release() {
    pointerId = null;
    if (!state.sensor) { state.x = 0; state.y = 0; }
    knob.style.transform = "";
  }
  stick.addEventListener("pointerdown", event => {
    pointerId = event.pointerId; stick.setPointerCapture(pointerId); setStick(event.clientX, event.clientY);
  });
  stick.addEventListener("pointermove", event => { if (event.pointerId === pointerId) setStick(event.clientX, event.clientY); });
  stick.addEventListener("pointerup", release);
  stick.addEventListener("pointercancel", release);

  addEventListener("keydown", event => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    keys.add(event.key.toLowerCase());
  });
  addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));

  function vector() {
    let x = state.x, y = state.y;
    if (keys.has("a") || keys.has("arrowleft")) x = -1;
    if (keys.has("d") || keys.has("arrowright")) x = 1;
    if (keys.has("w") || keys.has("arrowup")) y = -1;
    if (keys.has("s") || keys.has("arrowdown")) y = 1;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  async function enableSensors(onShake) {
    const orientationPermission = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"
      ? await DeviceOrientationEvent.requestPermission() : "granted";
    const motionPermission = typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function"
      ? await DeviceMotionEvent.requestPermission() : "granted";
    if (orientationPermission !== "granted") throw new Error("方向传感器权限未授予");
    state.sensor = true;
    let baseline = null;
    addEventListener("deviceorientation", event => {
      if (event.beta == null || event.gamma == null) return;
      if (!baseline) baseline = { beta: event.beta, gamma: event.gamma };
      state.x = Math.max(-1, Math.min(1, (event.gamma - baseline.gamma) / 18));
      state.y = Math.max(-1, Math.min(1, (event.beta - baseline.beta) / 18));
    });
    let lastShake = 0;
    if (motionPermission === "granted") addEventListener("devicemotion", event => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const magnitude = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      const now = performance.now();
      if (magnitude > 20 && now - lastShake > 700) { lastShake = now; onShake(); }
    });
  }

  return { state, keys, vector, enableSensors };
}
