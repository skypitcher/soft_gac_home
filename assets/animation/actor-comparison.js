/* Standalone SVG motion controller. No libraries or network requests at runtime. */
(() => {
  const root = document.documentElement;
  const layouts = [...root.querySelectorAll('[data-layout]')];
  const small = matchMedia('(max-width: 700px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cycle = 11.5;
  let current, frame = 0, elapsed = 0, previous = null;
  let userPaused = false, motionOptIn = false, printing = false;
  let inView = window.parent === window;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const pulse = x => Math.sin(Math.PI * clamp(x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const notify = (type, detail = {}) => {
    if (window.parent !== window) window.parent.postMessage({type, ...detail}, '*');
  };
  function prepare(g) {
    const get = s => g.querySelector(s);
    const paths = {};
    g.querySelectorAll('[data-path]').forEach(p => paths[p.dataset.path] = {element:p, length:p.getTotalLength()});
    return {g, paths,
      particles: Object.fromEntries([...g.querySelectorAll('[data-particle]')].map(p => [p.dataset.particle, p])),
      topHalo:get('[data-halo="top"]'), bottomHalo:get('[data-halo="bottom"]'),
      calls:[...g.querySelectorAll('[data-call]')],
      qHalos:[...g.querySelectorAll('[data-q-halo]')], kl:[...g.querySelectorAll('[data-kl]')],
      readyTop:get('[data-ready-ring="top"]'),readyBottom:get('[data-ready-ring="bottom"]'),
      topPort:get('[data-output="top"]'),bottomPort:get('[data-output="bottom"]'),
      leds:[...g.querySelectorAll('[data-led]')],
      bridgeProgress:get('[data-bridge-progress]'),
      left:+g.dataset.modelLeft,right:+g.dataset.modelRight,y:+g.dataset.topY,
      qBounds:JSON.parse(g.dataset.qBounds),
      qCenters:JSON.parse(g.dataset.qCenters || "[0.12,0.48,0.90]")
    };
  }
  const scenes = layouts.map(prepare);
  function hideParticles(s) {
    Object.values(s.particles).forEach(p => p.setAttribute('opacity', '0'));
  }
  function packet(s, key, pathName, progress, strength = 1, occlude = false) {
    const group = s.particles[key], path = s.paths[pathName];
    if (!group || !path) return;
    const distance = clamp(progress) * path.length;
    group.setAttribute('opacity', strength.toFixed(3));
    [...group.children].forEach((tail, i) => {
      const d = Math.max(0, distance - i * 13);
      const p = path.element.getPointAtLength(d);
      let hidden = false;
      if (occlude === 'top') hidden = p.x > s.left + 4 && p.x < s.right - 4 && Math.abs(p.y - s.y) < 44;
      if (occlude === 'bridge') hidden = s.qBounds.some(b => p.x > b[0] && p.x < b[1]);
      tail.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      tail.setAttribute('opacity', hidden || distance < i * 13 ? '0' : (Math.pow(.57,i)).toFixed(3));
    });
  }
  function ready(ring, port, amount, age) {
    port.setAttribute('stroke-opacity', (.45 + amount * .55).toFixed(3));
    port.setAttribute('fill-opacity', (.05 + amount * .10).toFixed(3));
    const wave = clamp(age / .85);
    ring.setAttribute('r', (26 + 12 * wave).toFixed(2));
    ring.setAttribute('opacity', (amount * (1-wave) * .32).toFixed(3));
  }
  function render(t, still = false) {
    const s=current;
    if (!s) return;
    hideParticles(s);
    const fade = t > 10.6 ? 1-smooth((t-10.6)/.9) : 1;
    // A few representative repeated calls stand for 1, 2, ..., N; not an NFE benchmark.
    const segments = [
      [.35,1.15,'top-entry','1'], [1.15,1.9,'top-through','1'],
      [1.9,3.65,'top-loop','1'], [3.65,4.4,'top-through','2'],
      [4.4,6.15,'top-loop','ellipsis'], [6.15,6.9,'top-through','N'],
      [6.9,7.8,'top-exit','N']
    ];
    const seg=segments.find(([start,end])=>t>=start && t<end);
    let call='N', topEnergy=0;
    if (!still && seg) {
      const [start,end,path,step]=seg;
      call=step;
      packet(s,'top',path,(t-start)/(end-start),fade,'top');
      if (path==='top-through') topEnergy=pulse((t-start)/(end-start));
    } else if (!still && t<.35) call='1';
    s.topHalo.setAttribute('opacity',(.1 + .65*topEnergy).toFixed(3));
    s.calls.forEach(c=>{
      const active=c.dataset.call===call;
      c.setAttribute('opacity',still||active?'1':'.64');
    });
    s.leds.forEach((led,i)=>led.setAttribute('opacity',(.18+topEnergy*(.4+.16*Math.sin(t*5+i))).toFixed(3)));
    let bridge=still?1:clamp((t-1.05)/1.8);
    const working=!still && t>=1.05 && t<2.85;
    s.bottomHalo.setAttribute('opacity',working?(.18+.34*pulse(bridge)).toFixed(3):'.08');
    if (!still && t>=.35 && t<1.05) packet(s,'bottom','bottom-entry',(t-.35)/.7,fade);
    if (working) packet(s,'bridge','bridge',bridge,fade,'bridge');
    if (!still && t>=2.85 && t<3.65) packet(s,'bottom','bottom-exit',(t-2.85)/.8,fade);
    const path=s.paths.bridge;
    s.bridgeProgress.setAttribute('stroke-dasharray',`${(path.length*bridge).toFixed(2)} ${path.length.toFixed(2)}`);
    s.bridgeProgress.setAttribute('opacity',still?'.5':(.25+.5*fade).toFixed(3));
    const qCenters=s.qCenters;
    s.qHalos.forEach((n,i)=>{
      const power=still?.16:working?Math.max(0,1-Math.abs(bridge-qCenters[i])/.17):0;
      n.setAttribute('opacity',(.06+.52*power).toFixed(3));
      s.kl[i].setAttribute('opacity',(.7+.3*power).toFixed(3));
    });
    ready(s.readyTop,s.topPort,still?1:clamp((t-7.8)/.35)*fade,t-7.8);
    ready(s.readyBottom,s.bottomPort,still?1:clamp((t-3.65)/.35)*fade,t-3.65);
    root.dataset.phase=still?'static':t<1.05?'input':t<3.65?'bridge':t<7.8?'repeat':'complete';
  }
  function shouldRun() {
    return inView && !document.hidden && !printing && !userPaused && (!reduced.matches || motionOptIn);
  }
  function tick(now) {
    frame=0;
    if (!shouldRun()) {previous=null;return;}
    if (previous!==null) elapsed=(elapsed+Math.min((now-previous)/1000,.1))%cycle;
    previous=now;
    render(elapsed);
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame=0; previous=null;
    const automaticStill=reduced.matches && !motionOptIn;
    if (automaticStill || printing) render(9,true);
    if (shouldRun()) frame=requestAnimationFrame(tick);
    root.dataset.playing=String(shouldRun());
    notify('softgac-actor-state',{paused:userPaused||automaticStill,reduced:automaticStill});
  }
  function layout() {
    const name=small.matches?'mobile':'wide';
    current=scenes.find(s=>s.g.dataset.layout===name);
    scenes.forEach(s=>s.g.setAttribute('display',s===current?'inline':'none'));
    const w=+current.g.dataset.width,h=+current.g.dataset.height;
    root.setAttribute('viewBox',`0 0 ${w} ${h}`);
    root.dataset.layout=name;
    render(elapsed,reduced.matches&&!motionOptIn);
    notify('softgac-actor-size',{width:w,height:h});
  }
  window.addEventListener('message',e=>{
    if (e.source!==window.parent || !e.data || e.data.type!=='softgac-actor-control') return;
    switch(e.data.command) {
      case 'visibility': inView=!!e.data.visible; break;
      case 'pause': userPaused=true; break;
      case 'play': userPaused=false;motionOptIn=true;break;
      case 'replay': elapsed=0;userPaused=false;motionOptIn=true;render(0);break;
      case 'print': printing=true;break;
      case 'state': printing=false;layout();break;
      default:return;
    }
    sync();
  });
  small.addEventListener('change',()=>{layout();sync();});
  reduced.addEventListener('change',()=>{motionOptIn=false;layout();sync();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('beforeprint',()=>{printing=true;sync();});
  window.addEventListener('afterprint',()=>{printing=false;layout();sync();});
  layout();sync();
})();
