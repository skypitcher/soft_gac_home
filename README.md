# SoftGAC Project Page

Project page for **Generative Actor-Critic with Soft Bridge Policies** (NeurIPS 2026).

- [Project page](https://skypitcher.github.io/soft_gac_home/)
- [Paper on arXiv](https://arxiv.org/abs/2605.08733)
- [JAX implementation](https://github.com/skypitcher/soft_gac_jax)

## Local preview

A buildless HTML/CSS/JavaScript site. From the repository root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. KaTeX and the Inter font load from CDNs (cdnjs, Google Fonts).

## Story and visual direction

The page follows the same story as the NeurIPS poster and the overview video, and uses the same visual language (navy hero, warm paper background, blue for SoftGAC and the actor bridge, orange for the reference process, Inter):

1. **Hero:** an animated soft bridge. A broad base z₀ ∼ q_ref takes K = 6 stochastic Gaussian hops onto three value modes, while a faint reference process stays broad. Particles pause and jump layer by layer: a discrete stochastic bridge, not a smooth flow.
2. **Overview:** one-sentence summary and the three claims, **Soft · Fast · Better**.
3. **Video:** the narrated 4-minute overview (English, subtitles burned in).
4. **Why generative policies?** An interactive obstacle example (sample from a Gaussian or a multimodal policy). Illustration only; the collision rates are integrated from the plotted densities.
5. **Two problems:** cost vs. performance, and intractable entropy for any implicit generator (approximations are inexact, surrogates are indirect).
6. **Method:** the bridge (each layer is a Gaussian transition, ≈ M/K params; the reference has no parameters), the parameter-budget comparison, Eq. 24 and Lemma 1, and the drop-in actor-critic updates.
7. **Theory:** Prop. 1, Thm. 1 (ideal, endpoint-equivalent), Thm. 2 / Cor. 1 (practical, fixed base), Prop. 2, and an interactive Boltzmann tilt at a fixed α.
8. **Results:** headline numbers, an interactive compute–return scatter, per-task final IQM bars, all 12 learning curves, and the latency and diffusion-comparison tables.
9. **Rollouts, analysis, citation.**

Wording conventions (keep them consistent with the poster and video): "one network call per action"; "about the same number of parameters"; "faster does not have to mean weaker" is scoped to these tasks and baselines; never "no trade-off"; prior soft regularizers are "approximations" or "surrogates", not "proxies".

## Content and data

- `assets/neurips_2026.pdf`: camera-ready paper; `assets/2605.08733v1.pdf` is kept for old links.
- `assets/softgac_poster.pdf`: the NeurIPS poster (140 × 90 cm).
- `assets/videos/softgac_overview_en.mp4` and `softgac_overview_poster.jpg`: the overview video and its poster frame.
- `assets/videos/*-run.mp4`, `h1-hurdle.mp4`: policy rollouts.
- `assets/og-softgac.jpg`: social preview card.
- `assets/figures/iqm_learning_curves_all12.svg`, `soft_regularizer_ablation_curves.svg`: vector exports of the paper figures.
- Numbers drawn by `script.js` (`METHODS`): per-domain latency and actor parameters from Fig. 3, final IQM per task from Fig. 9. The tables in `index.html` use Fig. 3 and Tables 5–10.

Older assets from the previous design (`assets/figures/actor-comparison-animated.svg`, `assets/animation/`, `scripts/`, the bridge-overview figures, `assets/fonts/`) are no longer referenced by the page.

When updating the paper, keep the PDF link, citation metadata, JSON-LD, BibTeX, figures and `sitemap.xml` consistent.

## GitHub Pages

Publish from the repository root on `main` using **Settings → Pages → Deploy from a branch → main / (root)**. The `.nojekyll` file keeps the site buildless. Local edits do not deploy until pushed.
