/* SoftGAC project page. Buildless; KaTeX is the only dependency. */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const gaussFrom = r => () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ---------------- math ---------------- */
  function renderMath() {
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
        throwOnError: false,
      });
    }
  }

  /* Text with \( ... \) math, rendered by KaTeX; the rest stays plain HTML. */
  const mixed = str => str.replace(/\\\((.+?)\\\)/g, (m, tex) =>
    window.katex ? window.katex.renderToString(tex, { throwOnError: false }) : tex);

  /* Math labels over an SVG diagram, as HTML positioned in viewBox units. KaTeX inside SVG
     <foreignObject> is mis-positioned in Safari, so labels sit in an overlay instead; their size
     follows the diagram width through container-query units. Each item: {x, y, html, size,
     anchor: "start" | "middle" | "end", color, weight}, with (x, y) the label's left/center/right
     edge and vertical center. */
  function overlay(svg, items) {
    const vb = svg.viewBox.baseVal, VW = vb.width, VH = vb.height;
    let wrap = svg.parentElement;
    if (!wrap.classList.contains("svgwrap")) {
      wrap = document.createElement("div");
      wrap.className = "svgwrap";
      svg.replaceWith(wrap);
      wrap.appendChild(svg);
    }
    wrap.querySelectorAll(":scope > .lbl").forEach(e => e.remove());
    const shift = { start: 0, middle: -50, end: -100 };
    return items.map(({ x, y, html, size = 16, anchor = "middle", color, weight }) => {
      const el = document.createElement("span");
      el.className = "lbl";
      el.style.left = (100 * x / VW) + "%";
      el.style.top = (100 * y / VH) + "%";
      el.style.fontSize = size + "px";                       // fallback without container queries
      el.style.fontSize = (100 * size / VW).toFixed(3) + "cqw";
      el.style.transform = `translate(${shift[anchor]}%, -50%)`;
      if (color) el.style.color = color;
      if (weight) el.style.fontWeight = weight;
      el.innerHTML = mixed(html);
      wrap.appendChild(el);
      return el;
    });
  }

  /* ---------------- hero: the soft bridge as particles ----------------
     A broad base z0 ~ q_ref (tanh(z0) uniform), K stochastic Gaussian hops guided onto three
     value modes; the reference process (faint orange) stays broad. Particles pause and jump
     layer by layer: a discrete stochastic bridge, not a smooth flow. */
  function heroBridge() {
    const canvas = document.getElementById("bridge-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const K = 6, h = 1 / K, modesZ = [-1.3, 0, 1.3];
    let W = 0, H = 0, dpr = 1, actor = [], ref = [], parts = [], layer = null, t0 = performance.now(), running = true;

    function build() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const r = rng(7), g = gaussFrom(r);
      const zq = () => clamp(Math.atanh(2 * clamp(r(), 0.02, 0.98) - 1), -2.3, 2.3);
      const narrow = W < 700;
      const x0 = W * (narrow ? 0.04 : 0.06), x1 = W * (narrow ? 0.96 : 0.94);
      const yc = H * 0.5, spread = H * (narrow ? 0.15 : 0.13);
      const X = k => x0 + (x1 - x0) * k / K, Y = z => yc + z * spread;
      const n = narrow ? 40 : 70;
      actor = []; ref = [];
      for (let i = 0; i < n; i++) {
        let z = zq();
        const w = modesZ.map(m => Math.exp(-((z - m) ** 2) / 2.2));
        let u = r() * w.reduce((s, v) => s + v, 0), m = 0;
        while (u > w[m] && m < modesZ.length - 1) { u -= w[m]; m++; }
        const pts = [[X(0), Y(z)]];
        for (let k = 0; k < K; k++) {
          z = z + (modesZ[m] - z) * (0.9 / (K - k)) + 0.9 * Math.sqrt(2 * h) * (1 - 0.8 * k / K) * g();
          pts.push([X(k + 1), Y(z)]);
        }
        actor.push(pts);
      }
      for (let i = 0; i < (narrow ? 14 : 24); i++) {
        let z = zq();
        const pts = [[X(0), Y(z)]];
        for (let k = 0; k < K; k++) { z = clamp(z - 2 * h * Math.tanh(z) + Math.sqrt(2 * h) * g(), -2.5, 2.5); pts.push([X(k + 1), Y(z)]); }
        ref.push(pts);
      }
      parts = Array.from({ length: narrow ? 26 : 46 }, () => ({ p: Math.floor(r() * actor.length), off: r() }));
      // static layer: guides, reference, actor paths, nodes, modes
      layer = document.createElement("canvas");
      layer.width = canvas.width; layer.height = canvas.height;
      const c = layer.getContext("2d");
      c.scale(dpr, dpr);
      c.setLineDash([3, 8]); c.strokeStyle = "rgba(158,195,255,0.13)"; c.lineWidth = 1.2;
      for (let k = 0; k <= K; k++) { c.beginPath(); c.moveTo(X(k), Y(-2.6)); c.lineTo(X(k), Y(2.6)); c.stroke(); }
      c.setLineDash([]);
      const poly = (pts, style, lw) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.strokeStyle = style; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); };
      ref.forEach(p => poly(p, "rgba(255,178,122,0.15)", 1.2));
      actor.forEach(p => poly(p, "rgba(140,188,255,0.22)", 1.4));
      c.fillStyle = "rgba(207,224,255,0.45)";
      actor.forEach(p => p.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill(); }));
      modesZ.forEach(m => {
        const gr = c.createRadialGradient(x1, Y(m), 0, x1, Y(m), 28);
        gr.addColorStop(0, "rgba(255,178,122,0.85)"); gr.addColorStop(1, "rgba(255,178,122,0)");
        c.fillStyle = gr; c.beginPath(); c.arc(x1, Y(m), 28, 0, 7); c.fill();
        c.fillStyle = "#ffb27a"; c.beginPath(); c.arc(x1, Y(m), 5, 0, 7); c.fill();
      });
      layer.revealX = [x0, x1];
    }

    function frame(now) {
      if (!running) return;
      // (re)build when the canvas gets a size (e.g. first shown, or resized)
      const rect = canvas.getBoundingClientRect();
      if (Math.abs(rect.width - W) > 1 || Math.abs(rect.height - H) > 1 || !layer || !layer.width) build();
      if (!W || !H) { if (!reduceMotion) requestAnimationFrame(frame); return; }
      const t = (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // reveal the static layer layer-by-layer on first load
      const [x0, x1] = layer.revealX, u = reduceMotion ? K : clamp(t / 2.6) * K, k = Math.floor(u);
      const rx = x0 + (x1 - x0) * Math.min(1, (k + easeInOut(clamp((u - k) / 0.7))) / K) + 10;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, rx * dpr, canvas.height); ctx.clip();
      ctx.drawImage(layer, 0, 0); ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vis = reduceMotion ? 0 : clamp((t - 1.8) / 0.8), stepT = 0.5;
      if (vis > 0) {
        parts.forEach(o => {
          const P = actor[o.p], cyc = (((t / stepT + o.off * (K + 2)) % (K + 2)) + K + 2) % (K + 2);
          let x, y, op;
          if (cyc >= K) { [x, y] = P[K]; op = 1 - clamp((cyc - K) / 1.4); }
          else {
            const s = Math.floor(cyc), f = easeInOut(clamp((cyc - s) / 0.55));
            x = lerp(P[s][0], P[s + 1][0], f); y = lerp(P[s][1], P[s + 1][1], f); op = s === 0 ? clamp(cyc / 0.4) : 1;
          }
          ctx.globalAlpha = vis * op * 0.9;
          ctx.fillStyle = cyc >= K - 1 ? "#ffd1ad" : "#e3eeff";
          ctx.beginPath(); ctx.arc(x, y, 2.8, 0, 7); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      if (!reduceMotion) requestAnimationFrame(frame);
    }

    build();
    requestAnimationFrame(frame);
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduceMotion) requestAnimationFrame(frame); }, 150); });
    if ("IntersectionObserver" in window && !reduceMotion) {
      new IntersectionObserver(([e]) => {
        const was = running; running = e.isIntersecting;
        if (running && !was) requestAnimationFrame(frame);
      }).observe(canvas);
    }
  }

  /* ---------------- why generative: a robot in front of an obstacle ----------------
     Steering a in [-1, 1]; the robot follows x(t) = cx + a·W·sin(πt). |a| < 0.5 hits the obstacle.
     Illustration only: the critic has two good modes at a = ±0.72. */
  function whyFigure() {
    const svg = document.getElementById("why-svg");
    if (!svg) return;
    const B = { cx: 235, y0: 470, y1: 44, W: 200, hitY: 286, thr: 0.5 };
    const PX = a => 545 + (a + 1) / 2 * 430;
    const Q = a => Math.exp(-((a + 0.72) ** 2) / 0.03) + Math.exp(-((a - 0.72) ** 2) / 0.03);
    const nrm = (a, m, s) => Math.exp(-((a - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
    const dens = { gauss: a => nrm(a, 0, 0.5), multi: a => 0.5 * nrm(a, -0.72, 0.1) + 0.5 * nrm(a, 0.72, 0.1) };
    const mass = f => { let m = 0; for (let a = -B.thr; a < B.thr; a += 0.001) m += f(a) * 0.001; return m; };
    const expected = { gauss: Math.round(100 * mass(dens.gauss)), multi: Math.round(100 * mass(dens.multi)) };
    const xs = Array.from({ length: 221 }, (_, i) => -1 + i / 110);
    const curve = (f, y0, sc) => xs.map((a, i) => (i ? "L" : "M") + PX(a).toFixed(1) + "," + (y0 - f(a) * sc).toFixed(1)).join("");

    svg.innerHTML = `
      <rect x="0" y="0" width="470" height="520" rx="16" fill="#fbfaf7"/>
      <line x1="${B.cx}" y1="22" x2="${B.cx}" y2="62" stroke="#12182b" stroke-width="3"/>
      <path d="M${B.cx},22 L${B.cx + 40},33 L${B.cx},44 Z" fill="#0f8a5f"/>
      <text x="${B.cx + 48}" y="40" font-size="17" font-weight="700" fill="#0f8a5f">goal</text>
      <rect x="${B.cx - 90}" y="223" width="180" height="54" rx="10" fill="#3b4459"/>
      <text x="${B.cx}" y="256" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">obstacle</text>
      <g id="why-trajs"></g>
      <circle cx="${B.cx}" cy="${B.y0}" r="20" fill="#0d1b36"/><path d="M${B.cx},457 L${B.cx + 10},476 L${B.cx - 10},476 Z" fill="#fff"/>
      <text x="${B.cx + 30}" y="476" font-size="17" font-weight="700" fill="#3b4459">robot</text>
      <rect x="${PX(-B.thr)}" y="24" width="${PX(B.thr) - PX(-B.thr)}" height="420" fill="#c2362f" fill-opacity="0.07"/>
      <text x="${PX(0)}" y="196" text-anchor="middle" font-size="15" font-weight="800" fill="#c2362f">hits the obstacle</text>
      <line x1="545" y1="140" x2="975" y2="140" stroke="#e3e1d9"/>
      <path d="${curve(Q, 140, 80)}" fill="none" stroke="#e2701b" stroke-width="3"/>
      <text x="545" y="222" font-size="15" font-weight="700" fill="#3b4459">policy density</text>
      <path id="why-pg" d="${curve(dens.gauss, 440, 210 / 2.2)}L${PX(1)},440L${PX(-1)},440Z" fill="#6b7489" fill-opacity="0.16" stroke="#6b7489" stroke-width="2.5"/>
      <path id="why-pm" d="${curve(dens.multi, 440, 210 / 2.2)}L${PX(1)},440L${PX(-1)},440Z" fill="#0a5cc2" fill-opacity="0.2" stroke="#0a5cc2" stroke-width="3"/>
      <line x1="545" y1="440" x2="975" y2="440" stroke="#3b4459" stroke-width="2"/>
      <text x="${PX(0)}" y="464" text-anchor="middle" font-size="14" fill="#6b7489">straight</text>
      <rect x="545" y="482" width="20" height="6" fill="#6b7489"/><text x="573" y="489" font-size="14" fill="#3b4459"><tspan font-weight="700">Gaussian</tspan> · one peak · ${expected.gauss}% hit</text>
      <rect x="545" y="504" width="20" height="6" fill="#0a5cc2"/><text x="573" y="511" font-size="14" fill="#3b4459"><tspan font-weight="700" fill="#0a5cc2">Generative</tspan> · two peaks · ${expected.multi}% hit</text>`;
    overlay(svg, [
      { x: 545, y: 34, html: String.raw`critic \(Q(s,a)\)`, size: 15, anchor: "start", color: "#c35a0e", weight: 700 },
      { x: 545, y: 459, html: String.raw`go left \((a=-1)\)`, size: 14, anchor: "start", color: "#6b7489" },
      { x: 975, y: 459, html: String.raw`go right \((a=+1)\)`, size: 14, anchor: "end", color: "#6b7489" },
    ]);
    const trajs = svg.querySelector("#why-trajs");
    const stat = document.getElementById("why-stat");
    let policy = "multi", seed = 11;

    function draw() {
      const r = rng(seed), g = gaussFrom(r), N = 24;
      trajs.innerHTML = "";
      let hits = 0;
      const timers = [];
      for (let i = 0; i < N; i++) {
        const a = clamp(policy === "gauss" ? 0.5 * g() : (r() < 0.5 ? -0.72 : 0.72) + 0.1 * g(), -0.98, 0.98);
        const hit = Math.abs(a) < B.thr;
        if (hit) hits++;
        const pts = [];
        for (let j = 0; j <= 48; j++) {
          const t = j / 48, x = B.cx + a * B.W * Math.sin(Math.PI * t), y = B.y0 - t * (B.y0 - B.y1);
          if (hit && y < B.hitY) { pts.push([x, B.hitY]); break; }
          pts.push([x, y]);
        }
        const color = hit ? "#c2362f" : policy === "gauss" ? "#6b7489" : "#0a5cc2";
        const path = svgEl("path", { d: pts.map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(""), class: "traj", stroke: color, "stroke-opacity": 0.85, pathLength: 1 }, trajs);
        const end = pts[pts.length - 1];
        let mark = null;
        if (hit) { mark = svgEl("text", { x: end[0].toFixed(1), y: (end[1] + 7).toFixed(1), "text-anchor": "middle", "font-size": 18, "font-weight": 900, fill: "#c2362f", opacity: 0 }, trajs); mark.textContent = "✗"; }
        const delay = reduceMotion ? 0 : i * 60;
        timers.push(setTimeout(() => { path.classList.add("on"); if (mark) setTimeout(() => mark.setAttribute("opacity", 1), reduceMotion ? 0 : 500); }, delay));
      }
      svg.querySelector("#why-pg").style.opacity = policy === "gauss" ? 1 : 0.3;
      svg.querySelector("#why-pm").style.opacity = policy === "multi" ? 1 : 0.3;
      stat.innerHTML = `<span class="${hits ? "hit" : "ok"}">${hits} / ${N}</span> sampled trajectories hit the obstacle (expected ${expected[policy]}%)`;
    }
    document.querySelectorAll(".why-controls .seg").forEach(b => b.addEventListener("click", () => {
      policy = b.dataset.policy;
      document.querySelectorAll(".why-controls .seg").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    }));
    document.getElementById("why-resample").addEventListener("click", () => { seed += 1; draw(); });
    // start drawing when the figure scrolls into view
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { draw(); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(svg);
    } else draw();
  }

  /* ---------------- method: the soft bridge diagram, with a sample hopping through the layers ---------------- */
  function bridgeFigure() {
    const svg = document.getElementById("bridge-svg");
    if (!svg) return;
    const LX = [100, 310, 630], SUB = ["0", "1", "K-1"];
    const bell = cx => `<path d="M${cx + 12},105 C${cx + 22},105 ${cx + 26},74 ${cx + 34},74 C${cx + 42},74 ${cx + 46},105 ${cx + 56},105" fill="rgba(10,92,194,0.12)" stroke="#0a5cc2" stroke-width="2.5"/>`;
    const layer = x => `<rect class="qb" x="${x}" y="60" width="120" height="80" rx="10" fill="#e8f0fb" stroke="#0a5cc2" stroke-width="2.5"/>${bell(x + 60)}`;
    const refb = x => `<rect x="${x}" y="205" width="120" height="70" rx="10" fill="#fdf0e4" stroke="#e2701b" stroke-width="2.5"/>`;
    const node = x => `<circle cx="${x}" cy="100" r="25" fill="#fff" stroke="#12182b" stroke-width="2.5"/>`;
    const kl = x => `<line x1="${x}" y1="140" x2="${x}" y2="205" stroke="#12182b" stroke-width="2" stroke-dasharray="5 5"/><rect class="klb" x="${x - 34}" y="157" width="68" height="31" rx="7" fill="#fff" stroke="#12182b" stroke-width="2"/>`;
    const NX = [45, 265, 475, 585, 800, 935];
    svg.innerHTML = `
      <defs>
        <marker id="bh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#0a5cc2"/></marker>
        <marker id="kh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#3b4459"/></marker>
        <marker id="oh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#e2701b"/></marker>
      </defs>
      <line x1="80" y1="22" x2="700" y2="22" stroke="#6b7489" stroke-width="2"/>
      <g stroke="#6b7489" stroke-width="2" marker-end="url(#kh)"><line x1="160" y1="22" x2="160" y2="56"/><line x1="370" y1="22" x2="370" y2="56"/><line x1="690" y1="22" x2="690" y2="56"/></g>
      <rect x="88" y="46" width="676" height="106" rx="14" fill="none" stroke="#0a5cc2" stroke-width="2.5" stroke-dasharray="10 7"/>
      ${LX.map(layer).join("")}${NX.map(node).join("")}
      <g stroke="#0a5cc2" stroke-width="2.5" marker-end="url(#bh)"><line x1="70" y1="100" x2="97" y2="100"/><line x1="220" y1="100" x2="237" y2="100"/><line x1="290" y1="100" x2="307" y2="100"/><line x1="430" y1="100" x2="447" y2="100"/><line x1="610" y1="100" x2="627" y2="100"/><line x1="750" y1="100" x2="772" y2="100"/><line x1="825" y1="100" x2="907" y2="100"/></g>
      ${LX.map(refb).join("")}
      <g fill="none" stroke="#e2701b" stroke-width="2" marker-end="url(#oh)"><path d="M45,125 V240 H97"/><path d="M265,125 V240 H307"/><path d="M585,125 V240 H627"/></g>
      ${[160, 370, 690].map(kl).join("")}
      <g stroke="#3b4459" stroke-width="2" marker-end="url(#kh)"><line x1="160" y1="275" x2="160" y2="318"/><line x1="370" y1="275" x2="370" y2="318"/><line x1="690" y1="275" x2="690" y2="318"/></g>
      <rect x="100" y="322" width="650" height="58" rx="10" fill="#0d1b36"/>
      <line x1="750" y1="351" x2="782" y2="351" stroke="#3b4459" stroke-width="2.5" marker-end="url(#kh)"/>
      <g id="hop"><circle r="16" fill="#ffb27a" opacity="0.45"/><circle r="9" fill="#e2701b" stroke="#fff" stroke-width="3"/></g>`;
    const T = String.raw;
    overlay(svg, [
      { x: 0, y: 24, html: T`state \(s\)`, size: 18, anchor: "start", color: "#6b7489" },
      ...LX.map((x, k) => ({ x: x + 38, y: 89, html: `\\(q_{\\theta,${SUB[k]}}\\)`, size: 21, color: "#0a5cc2" })),
      ...LX.map(x => ({ x: x + 60, y: 123, html: T`\(\approx M/K\) params`, size: 14, color: "#3b4459" })),
      ...[["0", 45], ["1", 265], ["2", 475], ["K-1", 585], ["K", 800]].map(([sub, x]) => ({ x, y: 100, html: `\\(z_{${sub}}\\)`, size: 19 })),
      { x: 935, y: 100, html: T`\(a\)`, size: 21 },
      { x: 530, y: 98, html: T`\(\cdots\)`, size: 20 },
      { x: 866, y: 84, html: T`\(\tanh\)`, size: 17, color: "#0a5cc2" },
      { x: 935, y: 145, html: "action", size: 15, color: "#6b7489" },
      ...LX.map((x, k) => ({ x: x + 60, y: 230, html: `\\(r_{${SUB[k]}}\\)`, size: 21, color: "#c35a0e" })),
      ...LX.map(x => ({ x: x + 60, y: 260, html: "no params", size: 15, color: "#3b4459" })),
      ...[160, 370, 690].map(x => ({ x, y: 172.5, html: T`\(\mathrm{KL}\)`, size: 16, weight: 800 })),
      { x: 780, y: 226, html: T`reference process \(R\)`, size: 17, anchor: "start", color: "#c35a0e", weight: 800 },
      { x: 780, y: 249, html: "max-entropy action prior", size: 14, anchor: "start", color: "#c35a0e" },
      { x: 780, y: 269, html: "fixed · no parameters", size: 14, anchor: "start", color: "#c35a0e" },
      { x: 425, y: 351, html: T`\(\mathcal C_\theta(s,\tau)=\sum_k \mathrm{KL}\big(q_{\theta,k}\,\|\,r_k\big)\) = exact path KL`, size: 19, color: "#fff", weight: 600 },
      { x: 790, y: 341, html: "replaces entropy in", size: 15, anchor: "start" },
      { x: 790, y: 362, html: "actor &amp; critic target", size: 15, anchor: "start" },
    ]);
    const hop = svg.querySelector("#hop"), boxes = [...svg.querySelectorAll(".qb")], kls = [...svg.querySelectorAll(".klb")];
    const PX = [45, 160, 265, 370, 475, 530, 585, 690, 800, 935];
    if (reduceMotion) { hop.setAttribute("transform", "translate(45,100)"); return; }
    let visible = false;
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) requestAnimationFrame(tick); }).observe(svg);
    const period = 5.2, t0 = performance.now();
    function tick(now) {
      if (!visible) return;
      const t = ((now - t0) / 1000) % period, p = clamp(t / 3.6);
      const u = easeInOut(p) * (PX.length - 1), i = Math.min(PX.length - 2, Math.floor(u)), f = u - i;
      const x = lerp(PX[i], PX[i + 1], f);
      hop.setAttribute("transform", `translate(${x.toFixed(1)},100)`);
      hop.style.opacity = t > 3.6 ? 1 - clamp((t - 3.6) / 0.8) : 1;
      [[100, 220], [310, 430], [630, 750]].forEach(([a, b], k) => {
        const on = t <= 3.6 && x > a - 10 && x < b + 10;
        boxes[k].setAttribute("fill", on ? "#c9dcf6" : "#e8f0fb");
        kls[k].setAttribute("fill", on ? "#ffe2c7" : "#fff");
      });
      requestAnimationFrame(tick);
    }
  }

  /* ---------------- theory: at a fixed alpha, Q tilts the uniform prior into the Boltzmann policy ---------------- */
  function boltzFigure() {
    const svg = document.getElementById("boltz-svg"), slider = document.getElementById("tilt"), txt = document.getElementById("tilt-text");
    if (!svg) return;
    const qa = a => Math.exp(-((a + 0.6) ** 2) / 0.02) + 0.6 * Math.exp(-((a - 0.15) ** 2) / 0.015) + 0.85 * Math.exp(-((a - 0.65) ** 2) / 0.02);
    const ALPHA = 0.25, L = 30, R = 870, n = 240, xs = Array.from({ length: n + 1 }, (_, i) => -1 + 2 * i / n);
    const X = a => L + (a + 1) / 2 * (R - L);
    const pol = lam => { const w = xs.map(a => 0.5 * Math.exp(lam * qa(a) / ALPHA)); const Z = w.reduce((s, v, i) => s + (i ? (v + w[i - 1]) / 2 : 0), 0) * (2 / n); return w.map(v => v / Z); };
    const pMax = Math.max(...pol(1)) * 1.08;
    const YP = v => 270 - v / pMax * 140;
    svg.innerHTML = `
      <line x1="${L}" y1="100" x2="${R}" y2="100" stroke="#e3e1d9"/>
      <path d="${xs.map((a, i) => (i ? "L" : "M") + X(a).toFixed(1) + "," + (100 - qa(a) * 70).toFixed(1)).join("")}" fill="none" stroke="#e2701b" stroke-width="3"/>
      <line x1="${L}" x2="${R}" y1="${YP(0.5)}" y2="${YP(0.5)}" stroke="#6b7489" stroke-width="2" stroke-dasharray="8 6"/>
      <path id="bp" fill="rgba(10,92,194,0.25)" stroke="#0a5cc2" stroke-width="3"/>
      <line x1="${L}" x2="${R}" y1="270" y2="270" stroke="#3b4459" stroke-width="2"/>
`;
    overlay(svg, [
      { x: L, y: 16, html: String.raw`critic \(Q(s,a)\)`, size: 15, anchor: "start", color: "#c35a0e", weight: 700 },
      { x: L, y: 120, html: String.raw`policy density on actions \(a\in(-1,1)\)`, size: 15, anchor: "start", color: "#0a5cc2", weight: 700 },
      { x: R, y: YP(0.5) - 14, html: String.raw`uniform prior \(u_R\)`, size: 13, anchor: "end", color: "#6b7489" },
      { x: L, y: 287, html: String.raw`\(a=-1\)`, size: 13, anchor: "start", color: "#6b7489" },
      { x: R, y: 287, html: String.raw`\(a=+1\)`, size: 13, anchor: "end", color: "#6b7489" },
    ]);
    const bp = svg.querySelector("#bp");
    function draw() {
      const lam = parseFloat(slider.value), d = pol(lam);
      bp.setAttribute("d", `M${X(-1)},270` + xs.map((a, i) => "L" + X(a).toFixed(1) + "," + YP(d[i]).toFixed(1)).join("") + `L${X(1)},270Z`);
      txt.innerHTML = mixed(lam < 0.03 ? String.raw`\(\lambda=0\): the uniform prior (maximum entropy)`
        : lam < 0.97 ? String.raw`\(\lambda=${lam.toFixed(2)}\): the value tilts the prior`
        : String.raw`\(\lambda=1\): \(\pi^\star\), every good mode is kept`);
    }
    slider.addEventListener("input", draw);
    draw();
    // a gentle one-time sweep the first time it is seen
    if (!reduceMotion && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const s0 = performance.now();
        const step = now => { const p = clamp((now - s0) / 2600); slider.value = easeInOut(p).toFixed(2); draw(); if (p < 1) requestAnimationFrame(step); };
        slider.value = 0; draw(); requestAnimationFrame(step);
      }, { threshold: 0.5 });
      io.observe(svg);
    }
  }

  /* ---------------- problem 1: many calls vs. one call ---------------- */
  function miniFigure() {
    const svg = document.getElementById("mini-svg");
    if (!svg) return;
    const T = String.raw;
    overlay(svg, [
      ...[31, 113, 195, 307].map(x => ({ x, y: 56, html: T`\(f_\theta\)`, size: 19 })),
      { x: 251, y: 56, html: T`\(\cdots\)`, size: 18 },
      { x: 360, y: 56, html: T`\(\times\,N\) calls`, size: 14, anchor: "start", color: "#3b4459", weight: 600 },
      { x: 160, y: 111, html: T`\(\nabla Q\) through all \(N\) calls`, size: 13, color: "#c2362f", weight: 600 },
      { x: 169, y: 171, html: T`\(f_\theta\) · \(M\) params`, size: 17, color: "#fff" },
      { x: 360, y: 171, html: T`\(\times\,1\) call · weaker`, size: 14, anchor: "start", color: "#3b4459", weight: 600 },
    ]);
  }

  /* ---------------- results data (paper Fig. 3 latencies & params, Fig. 9 final IQMs) ---------------- */
  const TASKS = ["Humanoid Run", "Humanoid Walk", "Dog Run", "Dog Trot", "H1 Hurdle", "H1 Stair", "H1 Run", "H1 Maze"];
  const METHODS = [
    { m: "SoftGAC",    c: "#0a5cc2", lat: [61, 75, 63],    par: [410, 526, 342], iqm: [701, 918, 755, 896, 737, 600, 824, 351], us: true },
    { m: "FLAC",       c: "#f0a202", lat: [55, 61, 55],    par: [322, 419, 311], iqm: [600, 765, 592, 868, 301, 381, 807, 331] },
    { m: "DIME",       c: "#e2701b", lat: [385, 393, 387], par: [423, 471, 418], iqm: [569, 704, 607, 828, 285, 301, 379, 336] },
    { m: "FlowRL",     c: "#555b66", lat: [55, 61, 55],    par: [322, 419, 311], iqm: [453, 869, 450, 748, 216, 95.1, 215, 288] },
    { m: "QSM",        c: "#0e9f74", lat: [183, 188, 184], par: [614, 712, 604], iqm: [0.87, 1.89, 358, 738, 167, 112, 176, 123] },
    { m: "QVPO",       c: "#d36fae", lat: [373, 387, 376], par: [369, 466, 358], iqm: [1.64, 1.99, 121, 210, 105, 105, 499, 259] },
    { m: "CrossQ-SAC", c: "#9aa0aa", lat: [31, 37, 31],    par: [321, 419, 311], iqm: [642, 870, 417, 692, 388, 260, 394, 345] },
  ];
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const fmt = v => (v < 10 ? v.toFixed(2) : Math.round(v).toString());

  function scatter() {
    const svg = document.getElementById("scatter"), tip = document.getElementById("scatter-tip");
    if (!svg) return;
    const W = 640, H = 420, L = 64, R = 18, T = 16, B = 56, xMax = 420, yMin = 100, yMax = 800;
    const sx = v => L + (v / xMax) * (W - L - R), sy = v => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
    let s = `<defs><marker id="sa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#0a5cc2"/></marker></defs>`;
    s += `<rect x="${sx(0)}" y="${sy(yMax)}" width="${sx(110) - sx(0)}" height="${sy(560) - sy(yMax)}" fill="#e8f0fb" rx="6"/>`;
    for (let v = 100; v <= 800; v += 100) s += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="#ecebe5"/><text x="${L - 10}" y="${sy(v) + 4}" text-anchor="end" font-size="12" fill="#6b7489">${v}</text>`;
    for (let v = 0; v <= 400; v += 100) s += `<text x="${sx(v)}" y="${sy(yMin) + 20}" text-anchor="middle" font-size="12" fill="#6b7489">${v}</text>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${sy(yMin)}" y2="${sy(yMin)}" stroke="#3b4459" stroke-width="1.5"/>`;
    s += `<text x="${(L + W - R) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" font-weight="600" fill="#3b4459">Inference time per action (µs) → lower is better</text>`;
    s += `<text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="600" fill="#3b4459">Avg. final IQM return ↑</text>`;
    const off = { "SoftGAC": [14, -8, "start"], "FLAC": [12, 4, "start"], "FlowRL": [12, 14, "start"], "CrossQ-SAC": [12, 18, "start"], "DIME": [-12, 20, "end"], "QSM": [12, -10, "start"], "QVPO": [-12, -10, "end"] };
    const pts = METHODS.map(d => ({ ...d, x: mean(d.lat), y: mean(d.iqm), p: mean(d.par) }));
    const dime = pts.find(d => d.m === "DIME"), us = pts.find(d => d.us);
    s += `<path d="M${sx(dime.x) - 2},${sy(dime.y) - 12} Q${(sx(dime.x) + sx(us.x)) / 2 + 30},${sy(us.y) - 18} ${sx(us.x) + 16},${sy(us.y) + 4}" fill="none" stroke="#0a5cc2" stroke-width="2" stroke-dasharray="7 5" marker-end="url(#sa)"/>`;
    s += `<text x="${(sx(dime.x) + sx(us.x)) / 2 + 60}" y="${sy(us.y) - 18}" text-anchor="middle" font-size="13" font-weight="800" fill="#0a5cc2">+44% at ≈1/6 latency</text>`;
    pts.slice().reverse().forEach(d => {
      const [dx, dy, anc] = off[d.m];
      s += `<g class="pt" tabindex="0" role="img" aria-label="${d.m}: ${Math.round(d.x)} µs per action, average IQM ${Math.round(d.y)}" data-m="${d.m}">
        <circle cx="${sx(d.x)}" cy="${sy(d.y)}" r="16" fill="transparent"/>
        <circle cx="${sx(d.x)}" cy="${sy(d.y)}" r="${d.us ? 9 : 7}" fill="${d.c}" stroke="#fff" stroke-width="2"/>
        <text x="${sx(d.x) + dx}" y="${sy(d.y) + dy}" text-anchor="${anc}" font-size="${d.us ? 15 : 13}" font-weight="${d.us ? 800 : 600}" fill="${d.us ? "#0a5cc2" : "#12182b"}">${d.m}</text></g>`;
    });
    svg.innerHTML = s;
    const show = (g, d) => {
      const c = g.querySelector("circle"), box = svg.getBoundingClientRect(), k = box.width / W;
      tip.innerHTML = `<b>${d.m}</b><br>${Math.round(d.x)} µs per action<br>avg. IQM ${Math.round(d.y)} (8 hard tasks)<br>actor ≈ ${(d.p / 1000).toFixed(2)}M params`;
      tip.style.left = (parseFloat(c.getAttribute("cx")) * k) + "px";
      tip.style.top = (parseFloat(c.getAttribute("cy")) * k) + "px";
      tip.style.opacity = 1;
    };
    svg.querySelectorAll(".pt").forEach(g => {
      const d = pts.find(p => p.m === g.dataset.m);
      g.addEventListener("mouseenter", () => show(g, d));
      g.addEventListener("focus", () => show(g, d));
      g.addEventListener("mouseleave", () => (tip.style.opacity = 0));
      g.addEventListener("blur", () => (tip.style.opacity = 0));
    });
  }

  function taskBars() {
    const tabs = document.getElementById("task-tabs"), bars = document.getElementById("task-bars");
    if (!tabs) return;
    const opts = ["Average", ...TASKS];
    tabs.innerHTML = opts.map((t, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-i="${i - 1}">${t}</button>`).join("");
    bars.innerHTML = METHODS.map(d => `<div class="tb${d.us ? " us" : ""}"><span class="tn">${d.m}</span><span class="track"><span class="fill" style="background:${d.c}"></span></span><span class="tv"></span></div>`).join("") +
      `<div class="tb-axis" aria-hidden="true"><span></span><span><i>0</i><i id="tb-max"></i></span><span></span></div>`;
    const rows = [...bars.querySelectorAll(".tb")];
    function show(i) {
      // one fixed axis from 0 to 1000 (the DMC return scale), so bar length is proportional to the value
      const vals = METHODS.map(d => (i < 0 ? mean(d.iqm) : d.iqm[i])), axis = 1000;
      rows.forEach((r, k) => { r.querySelector(".fill").style.width = (100 * vals[k] / axis) + "%"; r.querySelector(".tv").textContent = fmt(vals[k]); });
      bars.querySelector("#tb-max").textContent = axis;
    }
    tabs.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      tabs.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
      show(parseInt(b.dataset.i, 10));
    });
    show(-1);
  }

  /* ---------------- citation ---------------- */
  function copyBibtex() {
    const btn = document.getElementById("copy-bibtex"), status = document.getElementById("copy-status");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const text = document.getElementById("bibtex").textContent;
      try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; status.textContent = "BibTeX copied to clipboard"; }
      catch { btn.textContent = "Select and copy"; }
      setTimeout(() => (btn.textContent = "Copy BibTeX"), 1800);
    });
  }

  /* ---------------- demo videos play only when visible ---------------- */
  function demos() {
    const vids = document.querySelectorAll(".demo video");
    if (reduceMotion) vids.forEach(v => { v.removeAttribute("autoplay"); v.pause(); v.setAttribute("controls", ""); });
    if (!("IntersectionObserver" in window) || reduceMotion) return;
    const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.25 });
    vids.forEach(v => io.observe(v));
  }

  function init() {
    renderMath();
    heroBridge(); whyFigure(); miniFigure(); bridgeFigure(); boltzFigure(); scatter(); taskBars(); copyBibtex(); demos();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
