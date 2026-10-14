# SoftGAC Project Page

Academic project page for **Generative Actor-Critic with Soft Bridge Policies** (NeurIPS 2026).

- [Project page](https://skypitcher.github.io/soft_gac_home/)
- [Paper on arXiv](https://arxiv.org/abs/2605.08733)
- [JAX implementation](https://github.com/skypitcher/soft_gac_jax)

## Local preview

This is a buildless HTML/CSS/JavaScript site. From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. Opening `index.html` directly also works; MathJax loads from its CDN.

## Visual direction

The page uses a research-manuscript / academic-editorial style: paper-white background, ink-green and terracotta accents, self-hosted Newsreader headings, thin rules, and asymmetrical text/figure layouts. The authors remain in a horizontal list below the title, followed by affiliations. On narrow screens the list wraps cleanly and the reading order stays linear.

The color system pairs saturated emerald (`#007f5f`) with vermilion (`#c4432b`) on warm white (`#fffdf8`), with near-black body text. In the comparison illustration, slate marks the shared sampler, emerald the structured actor, and vermilion the external reference; original paper plots retain their own legends and colors.

Keep the site quiet: no navigation bar, marketing badges, decorative cards, entrance animations, or extra empirical claims. The computation diagram uses hatching and fine linework rather than gradients, shadows, or glowing components. Motion explains repeated evaluations versus internal structure; it is not a measured latency animation.

## Content and assets

The page follows the expressive / soft / cheap / better story, with bridge intuition before the SAC connection and experiments after the computation comparison. The homepage keeps the core intuition, the computation comparison, a compact inference-time table, and full 12-task learning curves. Derivations, training wall-clock plots, extended timing analyses, and secondary analyses—including Appendix F.2—are left to the paper, not hidden in expandable sections.

Lead with the two common compromises: relying on entropy approximations for softness, and sacrificing performance for speed. Explain the joint design of the actor’s stochastic structure and soft objective, rather than listing benefits alone. Describe action generation as **one network evaluation per action**; internal bridge depth is not the number of evaluations of the full actor.

- `assets/neurips_2026.pdf`: camera-ready paper; the original arXiv PDF is retained for existing links.
- `assets/figures/*.svg`: vector exports of original paper figures, not screenshots of paper pages.
- `assets/videos/`: policy rollouts and lightweight preview frames.
- `assets/fonts/`: self-hosted Newsreader fonts for the paper title, editorial headings, and core question, with the SIL Open Font License. Body text stays sans serif; small measurement notes use a system monospace font.
- `assets/figures/actor-comparison-animated.svg`: self-contained, responsive vector animation. A single compact comparison aligns two actor boxes side by side on desktop and stacks them tightly on mobile. One signal loops through the shared network; the other traverses the structured actor’s visible interior, without a second enlarged actor diagram. Reference transitions sit outside that actor, with centered local KL links. The two models have comparable total parameter budgets. Motion timing is illustrative, not a latency measurement.
- `scripts/build-actor-comparison.cjs` and `assets/animation/`: editable vector artwork, styles, and motion controller. TeX labels are compiled to SVG paths by MathJax at build time; the animation itself has no external runtime dependency. Separate wide/narrow compositions, pause/replay controls, offscreen pausing, a reduced-motion static view, and a static print view are included.
- The inference table transcribes camera-ready Figure 3: all seven main methods, three domains, per-action latency in microseconds, and complete actor parameter counts in thousands. Its approximate 5–10× comparison is against DIME, QSM, and QVPO, not the lower-latency flow or Gaussian baselines. Retain the CPU, evaluation-path, and compilation notes.

To regenerate a vector figure from its original source:

```bash
pdftocairo -svg path/to/original-figure.pdf assets/figures/figure-name.svg
```

To regenerate the animation (only needed when editing its vector source):

```bash
npm install --prefix /tmp/softgac-svg-build --no-audit --no-fund mathjax-full@3.2.2
NODE_PATH=/tmp/softgac-svg-build/node_modules node scripts/build-actor-comparison.cjs
node --test scripts/actor-comparison.test.cjs
```

The exported SVG is embedded as a sandboxed document so its animation also works with local-file previews. An ordinary Markdown/HTML image embed displays the static vector overview instead of executing scripts. The original PNG comparison is retained in the repository.

When updating the paper, keep the visible PDF link, citation metadata, JSON-LD, BibTeX, figures, and `sitemap.xml` consistent. Inference and training timings use different hardware and evaluation conventions; retain the measurement notes.

## GitHub Pages

Publish from the repository root on `main` using **Settings → Pages → Deploy from a branch → main / (root)**. The `.nojekyll` file keeps the site buildless. Local edits do not deploy until pushed.
