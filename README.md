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

The cover is [Panorama view of Barry Arm Landslide](https://www.usgs.gov/media/images/panorama-view-barry-arm-landslide), a public-domain field photograph by Tony Fischbach of the U.S. Geological Survey. It illustrates a geohazard setting, not an author field site. The 9440 x 2720 original is served as responsive WebP derivatives, with a mountain-centered crop on narrow screens. The optional desktop lens uses a higher-resolution derivative of the same photograph.

The optional **Terrain** view is a north-up shaded relief of the same fjord, not a hazard prediction or a georeferenced overlay of the panorama. It is built from the [USGS 3DEP historical 1 arc-second DEM, tile n62w149](https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/TIFF/historical/n62w149/USGS_1_n62w149_20171229.tif), resampled onto a local 10 m grid for display with 100 m contours. The image, approximate NAD83 coordinates and 1 km scale are served locally. The photo caption locates the [Barry Arm landslide](https://www.usgs.gov/data/select-model-results-simulations-hypothetical-rapid-failures-landslides-barry-arm-prince), not the camera. To regenerate the raster and its bounds from the downloaded tile, run:

```bash
python _tools/render-barry-relief.py USGS_1_n62w149_20171229.tif images/barry-arm-relief.webp
```

Regeneration requires NumPy and Pillow; neither is required to build or serve the site.

## Local Preview

The hero's "Ask about my research" button opens the research Q&A panel. Its suggested questions use the homepage's public content and never call the API. Free-form answers require the separately deployed Cloudflare Worker in `research-assistant/` and an explicitly enabled, still-funded grant. Only its public HTTPS origin belongs in `research_assistant_origin` in `_config.yml`; never put credentials or personal billing information in this repository. The backend directory is excluded from the Pages build.

Published entries with a DOI also have an **Ask about this paper** button. Opening a record, following its DOI, and copying its citation do not use model credit. Only an explicitly submitted question sends the selected title and DOI as context; switching papers starts a fresh conversation. The assistant uses the public homepage record, not the full text of the article.

With Playwright and Edge installed, run `node _tests/research-qa.cjs http://127.0.0.1:4000/` and `node _tests/landscape.cjs http://127.0.0.1:4000/`. The first intercepts Worker requests and spends no API credit; the second checks the map, magnifier and photo fallback across screen sizes.

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
