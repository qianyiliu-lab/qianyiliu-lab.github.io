# Qianyi Liu Academic Homepage

This repository contains the Jekyll/GitHub Pages source for Qianyi Liu's academic homepage:

https://qianyiliu-lab.github.io

The site is based on the AcadHomepage template and remains a static Jekyll site for long-term maintenance through Markdown, YAML, HTML, Liquid, and SCSS.

## Main Content Files

- `_config.yml` - site metadata, author profile, profile links, and GitHub Pages settings.
- `_pages/about.md` - homepage sections and Liquid rendering logic.
- `_layouts/profile.html` and `assets/css/profile.scss` - responsive homepage navigation and editorial layout.
- `_includes/bibliography.html` - publication entries and citation placeholders.
- `_data/research.yml` - research theme blocks.
- `_data/publications.yml` - selected and full publication entries.
- `_data/projects.yml` - project entries, methods, outputs, and resource links.
- `_data/news.yml` - awards and news items.
- `_data/teaching.yml` - teaching assistant entries.
- `images/qianyi-liu-profile.jpg` - public profile photo.
- `assets/pdf/Qianyi_Liu_CV.pdf` - downloadable CV.

## Cover Imagery

The cover compares two north-up views of Barry Arm, Alaska. **Satellite** contains modified Copernicus Sentinel data (2024): the [19 July Sentinel-2B true-colour scene](https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_6VVN_20240719_0_L2A) reprojected and compressed for the web. **Terrain** uses the [USGS 3DEP historical 1 arc-second elevation tile n62w149](https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/TIFF/historical/n62w149/USGS_1_n62w149_20171229.tif) with 100 m contours. Both use the same 1920 x 1080 grid, approximate NAD83 coordinates, scale and responsive crop. These are different measurements and acquisition dates, not a time series, a hazard prediction or a claim of fieldwork at this site.

The views dissolve on a seven-second cycle while visible. Choosing a layer pauses playback. Reduced motion and data-saver preferences disable automatic playback initially; without JavaScript the satellite view and attribution remain. All images are hosted locally; no map API or visitor key is needed. To rebuild:

```bash
python _tools/render-barry-relief.py USGS_1_n62w149_20171229.tif images/barry-arm-relief.webp
python _tools/render-barry-satellite.py
```

Both scripts require NumPy and Pillow. The satellite script also uses rasterio and reads only the required area of the public cloud-optimized GeoTIFF; a local TCI file can be passed as its argument. No geospatial packages are required to build or serve the homepage.

## Publication Figures

In `_data/publications.yml`, a published record can have a short `takeaway` and a `figure` with a local `src`, optional lighter `preview`, native width/height, label, alt text, caption, publisher source, author credit and license link. Keep original files in `images/publications/`. Never use a placeholder or post an under-review figure. The flood study shows its stacking workflow unchanged ([publisher figure](https://ars.els-cdn.com/content/image/1-s2.0-S167498712600109X-gr9_lrg.jpg), CC BY-NC-ND 4.0); the fire-frequency paper shows [PLOS Fig. 8](https://journals.plos.org/plosone/article/figure?id=10.1371%2Fjournal.pone.0255857.g008) unchanged under CC BY 4.0. These figures retain their paper-specific licenses.

## Local Preview

The hero's "Ask about my research" button opens the research Q&A panel. Its suggested questions use the homepage's public content and never call the API. Free-form answers require the separately deployed Cloudflare Worker in `research-assistant/` and an explicitly enabled, still-funded grant. Only its public HTTPS origin belongs in `research_assistant_origin` in `_config.yml`; never put credentials or personal billing information in this repository. The backend directory is excluded from the Pages build.

Published entries with a DOI also have an **Ask about this paper** button. Opening a record, following its DOI, and copying its citation do not use model credit. Only an explicitly submitted question sends the selected title and DOI as context; switching papers starts a fresh conversation. The assistant uses the public homepage record, not the full text of the article.

The sticky header downloads the CV directly; the cover links to the publication list and Q&A. The survey lens lives with the landscape controls. Each research theme can link to a project by matching its `project_id` to an `id` in `_data/projects.yml`.

With Playwright and Edge installed, run `node _tests/section-nav.cjs`, `node _tests/profile.cjs`, `node _tests/research-qa.cjs`, `node _tests/landscape.cjs` and `node _tests/publication-figures.cjs` against the local preview (port 4000 by default). They cover header navigation and downloads, the biography, mocked Q&A, landscape playback, figure selection and zoom, and no-script fallbacks.

Install Ruby and Bundler, then run:

```bash
bundle install
bundle exec jekyll serve
```

The included AcadHomepage helper can also be used on systems with Bash:

```bash
bash run_server.sh
```

Open http://127.0.0.1:4000 after the server starts.

## GitHub Pages Deployment

1. Create or rename the GitHub repository to `qianyiliu-lab.github.io`.
2. Push this repository to `https://github.com/qianyiliu-lab/qianyiliu-lab.github.io`.
3. In GitHub repository settings, enable GitHub Pages from the default branch.
4. The expected public URL is `https://qianyiliu-lab.github.io`.

## Google Scholar Citation Automation

The [citation workflow](https://github.com/qianyiliu-lab/qianyiliu-lab.github.io/actions/workflows/google_scholar_crawler.yaml) is scheduled daily at 08:17 UTC. It can also be started with **Run workflow**. It checks the public Google Scholar profile `UmPI1h0AAAAJ` and matches entries in `_data/publications.yml` by their explicit Scholar IDs and titles. It updates counts for listed papers; it does not add new publications or change editorial selections.

The date beside a count is the date that source returned the number, not merely the date the job ran. If Scholar blocks a request or a count cannot be verified, the site keeps the last verified value and labels it cached. A Crossref count, if available when no Scholar observation exists, is identified separately and is not a Google Scholar count. The Actions summary records each attempt. The data branch is `google-scholar-stats`; publishing uses the built-in `GITHUB_TOKEN`, with no additional secrets required. If scheduling stops after a period of inactivity, see [GitHub's instructions for re-enabling workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).

A separate, optional local backup runs `python google_scholar_crawler/weekly_backup.py` with the same pinned dependencies. It reads the latest data branch first and skips Scholar entirely when every listed paper has a verified observation less than seven days old. Otherwise it uses the same public-profile checks; it publishes just the two citation JSON files, by fast-forward only, when the stale counts can be verified. This backup needs a running local environment and authorized Git access to the data branch. It does not update the CV or the main branch.

## Remaining Content TODOs

- Confirm full coauthor order and metadata for the Geoscience Frontiers publication.
- Add PDF, code, data, and BibTeX links when available.
- Add representative research/project figures in `images/projects/`.
- Add course names, semesters, and concise teaching details.
- Add education dates, advisor/lab details, and additional awards or conference milestones.
