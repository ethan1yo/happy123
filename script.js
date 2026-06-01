const poster = document.querySelector(".poster-layer");
const maskCanvas = document.getElementById("maskCanvas");
const particleCanvas = document.getElementById("particleCanvas");
const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: false });
const particleCtx = particleCanvas.getContext("2d");

let width = 0;
let height = 0;
let strokes = [];
let particles = [];
let raf = 0;
let lastPoint = null;

const DPR_CAP = 2;
const ERASE_LIFE = 1700;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  width = window.innerWidth;
  height = window.innerHeight;

  for (const canvas of [maskCanvas, particleCanvas]) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  drawMask();
}

function drawMask() {
  const now = performance.now();
  strokes = strokes.filter((stroke) => now - stroke.t < ERASE_LIFE);

  maskCtx.globalCompositeOperation = "source-over";
  maskCtx.clearRect(0, 0, width, height);
  maskCtx.fillStyle = "#fff";
  maskCtx.fillRect(0, 0, width, height);

  maskCtx.globalCompositeOperation = "destination-out";
  for (const stroke of strokes) {
    const age = now - stroke.t;
    const fade = Math.max(0, 1 - age / ERASE_LIFE);
    const radius = stroke.r * (0.55 + fade * 0.45);
    const gradient = maskCtx.createRadialGradient(stroke.x, stroke.y, 1, stroke.x, stroke.y, radius);
    gradient.addColorStop(0, `rgba(0,0,0,${0.95 * fade})`);
    gradient.addColorStop(0.58, `rgba(0,0,0,${0.64 * fade})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    maskCtx.fillStyle = gradient;
    maskCtx.beginPath();
    maskCtx.arc(stroke.x, stroke.y, radius, 0, Math.PI * 2);
    maskCtx.fill();
  }

  poster.style.setProperty("--wipe-mask", `url(${maskCanvas.toDataURL("image/png")})`);
}

function addStroke(x, y, speed = 0) {
  const radius = Math.min(126, Math.max(58, 76 + speed * 0.16));
  strokes.push({ x, y, r: radius, t: performance.now() });

  for (let i = 0; i < 13; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const drift = 0.7 + Math.random() * 2.7 + speed * 0.012;
    particles.push({
      x: x + (Math.random() - 0.5) * radius * 0.5,
      y: y + (Math.random() - 0.5) * radius * 0.5,
      vx: Math.cos(angle) * drift,
      vy: Math.sin(angle) * drift - Math.random() * 0.6,
      size: 1 + Math.random() * 3.5,
      life: 42 + Math.random() * 35,
      maxLife: 77,
      hue: Math.random() > 0.5 ? 46 : 88,
    });
  }
}

function renderParticles() {
  particleCtx.clearRect(0, 0, width, height);
  particles = particles.filter((particle) => particle.life > 0);

  for (const particle of particles) {
    particle.life -= 1;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.985;
    particle.vy = particle.vy * 0.985 + 0.018;

    const opacity = Math.max(0, particle.life / particle.maxLife);
    particleCtx.fillStyle = `hsla(${particle.hue}, 32%, 74%, ${opacity * 0.72})`;
    particleCtx.beginPath();
    particleCtx.arc(particle.x, particle.y, particle.size * opacity, 0, Math.PI * 2);
    particleCtx.fill();
  }
}

function loop() {
  drawMask();
  renderParticles();
  raf = requestAnimationFrame(loop);
}

function pointerPosition(event) {
  const touch = event.touches?.[0];
  return {
    x: touch ? touch.clientX : event.clientX,
    y: touch ? touch.clientY : event.clientY,
  };
}

function wipe(event) {
  const point = pointerPosition(event);
  if (point.x == null || point.y == null) return;

  let speed = 0;
  if (lastPoint) {
    speed = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    const steps = Math.max(1, Math.min(8, Math.floor(speed / 24)));
    for (let i = 1; i <= steps; i += 1) {
      const x = lastPoint.x + ((point.x - lastPoint.x) * i) / steps;
      const y = lastPoint.y + ((point.y - lastPoint.y) * i) / steps;
      addStroke(x, y, speed);
    }
  } else {
    addStroke(point.x, point.y, speed);
  }

  lastPoint = point;
}

function clearPointer() {
  lastPoint = null;
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", wipe, { passive: true });
window.addEventListener("pointerleave", clearPointer);
window.addEventListener("pointerup", clearPointer);
window.addEventListener("touchmove", wipe, { passive: true });
window.addEventListener("touchend", clearPointer);

resize();
loop();

window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
