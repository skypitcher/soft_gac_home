# SoftGAC Project Page

Static academic project page for **SoftGAC: Generative Actor-Critic with Soft Bridge Policies**.

Project page: [SoftGAC, a generative actor-critic for maximum entropy RL, diffusion policy, flow policy, and flow matching policy actors](https://skypitcher.github.io/soft_gac_home/).

SoftGAC studies whether a reinforcement-learning actor can be expressive, soft, cheap, and better: it keeps the multimodal expressiveness of latent generative policies, makes the MaxEnt RL soft objective analytical through path-wise bridge regularization, and targets lower compute than high-NFE diffusion and flow policy actors without surrendering returns.

Open `index.html` directly in a browser, or serve the directory with any static file server for local preview.

## Local Preview

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## GitHub Pages

This is a static site. Publish from the repository root on the `main` branch:

1. Push this directory to a GitHub repository.
2. Open the repository on GitHub.
3. Go to `Settings` -> `Pages`.
4. Set `Build and deployment` source to `Deploy from a branch`.
5. Select `main` and `/ (root)`, then save.
