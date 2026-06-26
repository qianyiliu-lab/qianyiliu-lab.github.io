# Qianyi Liu Academic Homepage

This repository contains the Jekyll/GitHub Pages source for Qianyi Liu's academic homepage:

https://qianyiliu.github.io

The site is based on the AcadHomepage template and remains a static Jekyll site for long-term maintenance through Markdown, YAML, HTML, Liquid, and SCSS.

## Main Content Files

- `_config.yml` - site metadata, author profile, profile links, and GitHub Pages settings.
- `_pages/about.md` - homepage sections and Liquid rendering logic.
- `_data/research.yml` - research theme blocks.
- `_data/publications.yml` - selected and full publication entries.
- `_data/projects.yml` - project cards and TODO links.
- `_data/news.yml` - awards and news items.
- `_data/teaching.yml` - teaching assistant entries.
- `images/qianyi-liu-profile.jpg` - public profile photo.
- `assets/pdf/Qianyi_Liu_CV.pdf` - downloadable CV.

## Local Preview

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

1. Create or rename the GitHub repository to `qianyiliu.github.io`.
2. Push this repository to `https://github.com/qianyiliu/qianyiliu.github.io`.
3. In GitHub repository settings, enable GitHub Pages from the default branch.
4. The expected public URL is `https://qianyiliu.github.io`.

## Google Scholar Citation Automation

The original AcadHomepage crawler workflow is retained. To enable it, add this repository secret:

- `GOOGLE_SCHOLAR_ID`: `UmPI1h0AAAAJ`

No private tokens or credentials are stored in this repository.

## Remaining Content TODOs

- Confirm full coauthor order and metadata for the Geoscience Frontiers publication.
- Add PDF, code, data, and BibTeX links when available.
- Add representative research/project figures in `images/projects/`.
- Add course names, semesters, and concise teaching details.
- Add education dates, advisor/lab details, and additional awards or conference milestones.
