# Michael Tawfik — Portfolio

[Visit the live portfolio](https://michaelll402.github.io/)

The portfolio of Michael Tawfik, a Computer Science student at ELTE in Budapest working toward full-stack software engineering roles. It presents selected projects through case studies and interactive demonstrations.

## Explore the work

- [Customer Support Ticketing SaaS](https://michaelll402.github.io/work/support/) — full-stack support workflows, realtime updates, and access control.
- [Face Recognition Attendance](https://michaelll402.github.io/work/vision/) — a Python computer-vision and attendance project.
- [Simiutopia](https://michaelll402.github.io/work/simiutopia/) — vehicle movement and persistence work in a Java city simulation.
- [Subways of Budapest](https://michaelll402.github.io/work/subways/) — a JavaScript route-building game with rule validation.
- [ClassForge](https://michaelll402.github.io/work/classforge/) — a local-first Java UML class-diagram editor for Windows.

The site also includes Michael's experience, skills, contact details, and [CV](https://michaelll402.github.io/cv.pdf).

## Technology

Built as a static Astro 5 site with TypeScript, React islands for interactive experiences, and Three.js/React Three Fiber for the desktop galaxy. Mobile uses a lighter visual treatment. The public contact form uses Formspree. Fonts and portfolio assets are served with the site.

## Run locally

Use Node.js 24 and pnpm 11.8.0. From the repository root:

```sh
cd v5
pnpm install --frozen-lockfile
pnpm dev
```

For a production check:

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

## Deployment

The [GitHub Pages workflow](.github/workflows/deploy-v5.yml) builds `v5/` and publishes only its generated static artifact at the repository's root website. It runs on relevant pushes to `main` and can also be started manually. No server runtime or deployment commit is required.

## Contact

[Email Michael](mailto:michaeltawfik2004@gmail.com) or use the contact form on the [live site](https://michaelll402.github.io/).
