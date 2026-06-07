# WheatQTLdb V3.0

A modern, **open-source**, **static** rebuild of the original
[WheatQTLdb](http://wheatqtldb.net) — a manually curated database of QTL,
metaQTL and epistatic QTL in *Triticum aestivum* and related wheat species.

> Built so it can be hosted **for free on GitHub Pages**, with no server, no
> MySQL and a transparent CSV-based data layer.

## What's improved over V2.0

- **Free, fast, static hosting** on GitHub Pages — automated CI/CD via Actions.
- **Modern responsive UI** (React + TypeScript + Tailwind) with dark mode.
- **Powerful tables** with column sort, full-text search, pagination, CSV export.
- **Interactive charts** (totals, by species, trait category, chromosome, year).
- **CSV-based data layer** in `public/data/` — community PRs welcome.
- **Schema-typed** in `src/lib/types.ts` for editor autocomplete & validation.
- **DOI auto-linking** in reference columns.
- **Mobile-friendly**, accessible navigation.
- **MIT licensed** — fork it, run it offline, embed it.

## Tech stack

| Concern         | Choice                                        |
| --------------- | --------------------------------------------- |
| Build           | [Vite](https://vitejs.dev/) + TypeScript      |
| UI              | React 18 + Tailwind CSS                       |
| Routing         | react-router-dom                              |
| Tables          | @tanstack/react-table                         |
| Charts          | recharts                                      |
| Icons           | lucide-react                                  |
| CSV             | papaparse                                     |
| Hosting         | GitHub Pages (via GitHub Actions)             |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into ./dist
npm run preview  # serve the production build locally
```

## Adding / updating data

Drop CSV files into `public/data/`:

- `qtl.csv`
- `metaqtl.csv`
- `epistatic.csv`
- `candidate_genes.csv`

Schema and column lists are documented in
[`public/data/README.md`](public/data/README.md). The site reloads them at
runtime — no rebuild required for local dev.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** = **GitHub Actions**.
3. Push to `main`. The workflow at
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) will build
   and publish the site to
   `https://<your-user>.github.io/<repo-name>/`.

The workflow automatically sets `VITE_BASE` to `/<repo-name>/` so asset paths
and the SPA router work under a project-page sub-path. It also copies
`dist/index.html` to `dist/404.html` so deep links survive a refresh.

> If you deploy to a **user/organisation** site (`<user>.github.io`), set
> `VITE_BASE=/` in the workflow.

## Custom domain

Add a file `public/CNAME` containing your domain (e.g. `wheatqtldb.org`). Set
the matching DNS record (`CNAME` to `<user>.github.io`). Then set
`VITE_BASE=/` in the workflow because custom domains serve from the root.

## Citing

If you use this resource, please cite the original WheatQTLdb papers:

- Singh, K., Saini, D.K., Saripalli, G. et al. *WheatQTLdb V2.0: a supplement
  to the database for wheat QTL.* Mol Breeding 42, 56 (2022).
  [doi:10.1007/s11032-022-01329-1](https://doi.org/10.1007/s11032-022-01329-1)
- Singh K, Batra R, Sharma S, et al. *WheatQTLdb: a QTL database for wheat.*
  Mol Genet Genomics 296, 1051–1056 (2021).
  [doi:10.1007/s00438-021-01796-9](https://doi.org/10.1007/s00438-021-01796-9)

## Acknowledgements

Original database conceived and curated by the Department of Genetics & Plant
Breeding, **Ch. Charan Singh University, Meerut, India**, led by Prof. PK
Gupta and team. V3.0 is an independent, community-driven modernisation; data
remains the intellectual contribution of the original curators.

## License

[MIT](LICENSE) for the code. Data files retain the licensing of their
original publications.
