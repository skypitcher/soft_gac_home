(() => {
  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (_) { /* File previews may need the selection-based fallback. */ }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:-1000px;';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy failed');
  }

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    const initialLabel = button.textContent;
    button.addEventListener('click', async () => {
      const code = document.getElementById(button.dataset.copyTarget);
      const status = document.getElementById('copy-status');
      if (!code) return;
      try {
        await copyText(code.textContent.trim());
        button.textContent = 'Copied';
        if (status) status.textContent = 'BibTeX copied to clipboard.';
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = 'Text selected';
        if (status) status.textContent = 'BibTeX selected. Press Control+C or Command+C to copy.';
      }
      window.setTimeout(() => { button.textContent = initialLabel; }, 2200);
    });
  });

  // The diagram is a self-contained SVG document, also usable outside this page.
  const actorFrame = document.querySelector('.actor-animation');
  if (actorFrame) {
    const toggle = document.querySelector('[data-animation-toggle]');
    const replay = document.querySelector('[data-animation-replay]');
    let paused = false;
    let inView = false;
    const send = (command, detail = {}) => {
      actorFrame.contentWindow?.postMessage({ type: 'softgac-actor-control', command, ...detail }, '*');
    };
    const visibility = () => send('visibility', { visible: inView && !document.hidden });
    window.addEventListener('message', (event) => {
      if (event.source !== actorFrame.contentWindow || !event.data) return;
      if (event.data.type === 'softgac-actor-size') {
        const { width, height } = event.data;
        if ((width === 1040 && height === 414) || (width === 560 && height === 640)) {
          actorFrame.style.aspectRatio = `${width} / ${height}`;
        }
        visibility();
      }
      if (event.data.type === 'softgac-actor-state') {
        paused = !!event.data.paused;
        toggle.textContent = paused ? 'Play animation' : 'Pause animation';
        toggle.disabled = false;
        replay.disabled = false;
      }
    });
    toggle.addEventListener('click', () => send(paused ? 'play' : 'pause'));
    replay.addEventListener('click', () => send('replay'));
    actorFrame.addEventListener('load', () => { send('state'); visibility(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        visibility();
      }, { threshold: 0 });
      observer.observe(actorFrame);
    } else { inView = true; }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeprint', () => send('print'));
    window.addEventListener('afterprint', () => send('state'));
    send('state');
  }

  // Respect reduced motion and pause offscreen rollouts, without overriding a manual pause.
  const videos = Array.from(document.querySelectorAll('video'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const userPaused = new WeakSet();
  const automaticPauses = new WeakSet();
  function updateVideo(video) {
    const shouldPlay = visible.has(video) && !document.hidden && !reducedMotion.matches && !userPaused.has(video);
    if (shouldPlay) {
      video.play().catch(() => {}); // Native controls remain available if autoplay is blocked.
    } else if (!video.paused) {
      automaticPauses.add(video);
      video.pause();
    }
  }
  videos.forEach((video) => {
    if (reducedMotion.matches) { video.autoplay = false; video.pause(); }
    video.addEventListener('pause', () => {
      if (automaticPauses.has(video)) automaticPauses.delete(video);
      else userPaused.add(video);
    });
    video.addEventListener('play', () => userPaused.delete(video));
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) visible.add(target);
        else visible.delete(target);
        updateVideo(target);
      });
    }, { threshold: 0.1 });
    videos.forEach((video) => observer.observe(video));
    document.addEventListener('visibilitychange', () => videos.forEach(updateVideo));
    reducedMotion.addEventListener('change', () => videos.forEach(updateVideo));
  }
})();
