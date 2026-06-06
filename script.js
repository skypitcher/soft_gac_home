(function () {
  const canvas = document.getElementById("bridge-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = ["#57a8dc", "#f0a34a", "#58c3a4", "#cf6d60", "#9f7cc0"];
  const particles = [];
  const pathCount = 42;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointer = { x: -1000, y: -1000 };

  function seeded(index) {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
    draw(0);
  }

  function buildParticles() {
    particles.length = 0;
    for (let i = 0; i < pathCount; i += 1) {
      const lane = seeded(i + 1);
      const amp = 18 + seeded(i + 7) * 72;
      const base = height * (0.23 + lane * 0.54);
      particles.push({
        phase: seeded(i + 4),
        speed: 0.018 + seeded(i + 11) * 0.038,
        base,
        amp,
        color: colors[i % colors.length],
        radius: 1.8 + seeded(i + 9) * 2.4,
        offset: seeded(i + 14) * Math.PI * 2
      });
    }
  }

  function curveY(p, x, time) {
    const progress = x / width;
    const fold = Math.sin(progress * Math.PI * 3 + p.offset);
    const drift = Math.sin(progress * Math.PI * 1.4 + time * 0.001 + p.offset) * p.amp;
    return p.base + drift + fold * 18;
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#101714";
    ctx.fillRect(0, 0, width, height);

    const left = width * 0.1;
    const right = width * 0.92;
    const usable = right - left;

    ctx.lineWidth = 1;
    particles.forEach((p, index) => {
      ctx.beginPath();
      for (let step = 0; step <= 90; step += 1) {
        const x = left + (step / 90) * usable;
        const y = curveY(p, x, time);
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = p.color + "30";
      ctx.stroke();

      const progress = reducedMotion ? p.phase : (p.phase + time * p.speed * 0.0007) % 1;
      const x = left + progress * usable;
      let y = curveY(p, x, time);
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 150) {
        y += (dy / Math.max(distance, 1)) * (150 - distance) * 0.18;
      }

      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.42 + (index % 5) * 0.08;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    for (let i = 0; i < 7; i += 1) {
      const x = left + (i / 6) * usable;
      ctx.beginPath();
      ctx.moveTo(x, height * 0.2);
      ctx.lineTo(x, height * 0.82);
      ctx.strokeStyle = "rgba(247, 250, 246, 0.065)";
      ctx.stroke();
    }

    if (!reducedMotion) requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  window.addEventListener("pointerleave", () => {
    pointer = { x: -1000, y: -1000 };
  });

  resize();
  if (reducedMotion) draw(0);
  else requestAnimationFrame(draw);
})();

(function () {
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (error) {
      // Fall through to the textarea fallback.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy failed");
  }

  function selectText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    const originalText = button.textContent.trim();
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;

      try {
        await copyText(target.textContent.trim());
        button.textContent = "Copied";
      } catch (error) {
        selectText(target);
        button.textContent = "Selected";
      }

      window.setTimeout(() => {
        button.textContent = originalText;
      }, 1600);
    });
  });

  function scrollToHashTarget(instant) {
    if (!window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;

    if (!instant) {
      target.scrollIntoView({ block: "start" });
      return;
    }

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    const offset = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
    root.style.scrollBehavior = "auto";
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset),
      left: 0,
      behavior: "auto"
    });
    root.style.scrollBehavior = previousScrollBehavior;
  }

  window.addEventListener("load", () => {
    window.setTimeout(() => scrollToHashTarget(true), 0);
  });
  window.addEventListener("hashchange", () => {
    window.setTimeout(() => scrollToHashTarget(false), 0);
  });
})();
