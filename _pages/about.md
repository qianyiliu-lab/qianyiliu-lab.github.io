---
permalink: /
title: "Qianyi Liu"
excerpt: "Academic homepage of Qianyi Liu"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

<span class="anchor" id="about-me"></span>

# Qianyi Liu

**PhD Student in Civil Engineering \| Geospatial AI, Geohazards, Remote Sensing, and Machine Learning**

Department of Civil Engineering, Stony Brook University  
Stony Brook, NY, USA  
[qianyi.liu@stonybrook.edu](mailto:qianyi.liu@stonybrook.edu)

<div class="profile-actions">
  <a class="btn btn--primary" href="/assets/pdf/Qianyi_Liu_CV.pdf">Download CV</a>
  <a class="btn btn--inverse" href="https://scholar.google.com/citations?user=UmPI1h0AAAAJ&hl=en&authuser=2">Google Scholar</a>
  <a class="btn btn--inverse" href="https://orcid.org/0009-0006-0161-4639">ORCID</a>
  <a class="btn btn--inverse" href="https://github.com/qianyiliu">GitHub</a>
  <a class="btn btn--inverse" href="https://www.linkedin.com/in/qianyi-liu-544783414">LinkedIn</a>
</div>

Qianyi Liu is a PhD student in Civil Engineering at Stony Brook University. Her research focuses on geohazard susceptibility assessment, remote sensing, GIS, and machine learning/deep learning methods for landslide and flood risk analysis. She is particularly interested in integrating geospatial data, physically meaningful environmental predictors, and explainable AI to improve the reliability and interpretability of hazard susceptibility mapping.

<div class="tag-list">
  <span>Geohazards</span>
  <span>Landslide Susceptibility Mapping</span>
  <span>Flood Susceptibility Assessment</span>
  <span>Remote Sensing</span>
  <span>GIS</span>
  <span>Machine Learning</span>
  <span>Deep Learning</span>
  <span>Explainable AI</span>
  <span>Self-Supervised Learning</span>
  <span>Spatial Validation</span>
</div>

<span class="anchor" id="research"></span>

# Research

{% for theme in site.data.research %}
<section class="research-block">
  <div class="placeholder-figure">
    <strong>Figure placeholder</strong>
    <code>{{ theme.image_path }}</code>
  </div>
  <div markdown="1">
  ## {{ theme.title }}

  {{ theme.description }}

  <div class="tag-list compact">
    {% for keyword in theme.keywords %}<span>{{ keyword }}</span>{% endfor %}
  </div>

  <p class="todo-note">{{ theme.todo }}</p>
  </div>
</section>
{% endfor %}

<span class="anchor" id="publications"></span>

# Publications

## Selected Publications

{% assign selected_pubs = site.data.publications | where: "selected", true %}
{% for pub in selected_pubs %}
<div class="publication-entry" markdown="1">
**{{ pub.title }}**

{{ pub.authors | markdownify }}

*{{ pub.venue }}*, {{ pub.year }}.
{% if pub.doi %}[DOI](https://doi.org/{{ pub.doi }}){% endif %}
{% if pub.pdf %} \| [PDF]({{ pub.pdf }}){% endif %}
{% if pub.code %} \| [Code]({{ pub.code }}){% endif %}
{% if pub.data %} \| [Data]({{ pub.data }}){% endif %}
{% if pub.bibtex %} \| [BibTeX]({{ pub.bibtex }}){% endif %}

{% if pub.notes %}
{% for note in pub.notes %}
<p class="todo-note">{{ note }}</p>
{% endfor %}
{% endif %}
</div>
{% endfor %}

## Full Publications

{% for pub in site.data.publications %}
<div class="publication-entry compact-entry" markdown="1">
**{{ pub.title }}**  
{{ pub.authors | markdownify }}
*{{ pub.venue }}*, {{ pub.year }}.
{% if pub.doi %}[DOI](https://doi.org/{{ pub.doi }}){% endif %}
{% if pub.pdf %} \| [PDF]({{ pub.pdf }}){% endif %}
{% if pub.code %} \| [Code]({{ pub.code }}){% endif %}
{% if pub.data %} \| [Data]({{ pub.data }}){% endif %}
{% if pub.bibtex %} \| [BibTeX]({{ pub.bibtex }}){% endif %}
</div>
{% endfor %}

<span class="anchor" id="projects"></span>

# Projects

<div class="project-grid">
{% for project in site.data.projects %}
  <article class="project-card">
    <div class="project-card__media">
      <strong>Representative figure</strong>
      <code>{{ project.image_path }}</code>
    </div>
    <div class="project-card__body" markdown="1">
    <span class="status-tag">{{ project.status }}</span>
    ## {{ project.title }}

    {{ project.summary }}

    **Methods / tools:** {{ project.methods }}

    **Representative outputs:** {{ project.outputs }}

    {% if project.links and project.links.size > 0 %}
    <p class="link-row">
    {% for link in project.links %}
      <a href="{{ link.url }}">{{ link.label }}</a>{% unless forloop.last %} | {% endunless %}
    {% endfor %}
    </p>
    {% endif %}

    <p class="todo-note">{{ project.todo }}</p>
    </div>
  </article>
{% endfor %}
</div>

<span class="anchor" id="awards-news"></span>

# Awards & News

{% for item in site.data.news %}
- **{{ item.date }}** - {{ item.text }}
{% endfor %}

<span class="anchor" id="teaching"></span>

# Teaching

{% for item in site.data.teaching %}
- **{{ item.role }}, {{ item.course }}**, {{ item.institution }}. {{ item.semester }}. {{ item.description }}
{% endfor %}

<span class="anchor" id="cv"></span>

# CV

<a class="btn btn--primary" href="/assets/pdf/Qianyi_Liu_CV.pdf">Download CV</a>

## Education

- **PhD Student in Civil Engineering**, Stony Brook University. TODO: Add start year, advisor, and dissertation topic if desired.

## Research Experience

- Geohazard susceptibility assessment, remote sensing, GIS, and machine learning/deep learning for landslide and flood risk analysis.
- TODO: Add research assistant appointments, lab affiliation, and project dates.

## Publications

- See the [Publications](#publications) section above.

## Awards

- First Place, Individual Poster Presentation, NSF NHERI GSC Mini-Conference, 2026.

## Teaching

- See the [Teaching](#teaching) section above.

## Technical Skills

- **Programming:** Python, MATLAB, R, SQL
- **Geospatial tools:** ArcGIS Pro, ArcMap, Google Earth Engine, QGIS
- **Machine learning / deep learning:** scikit-learn, PyTorch, XGBoost, LightGBM, CatBoost
- **Research areas:** Remote sensing and geospatial analysis; hydrodynamic modeling and geohazard susceptibility mapping

<span class="anchor" id="contact"></span>

# Contact

- **Email:** [qianyi.liu@stonybrook.edu](mailto:qianyi.liu@stonybrook.edu)
- **Affiliation:** Department of Civil Engineering, Stony Brook University
- **Location:** Stony Brook, NY, USA
- **Google Scholar:** [UmPI1h0AAAAJ](https://scholar.google.com/citations?user=UmPI1h0AAAAJ&hl=en&authuser=2)
- **ORCID:** [0009-0006-0161-4639](https://orcid.org/0009-0006-0161-4639)
- **GitHub:** [qianyiliu](https://github.com/qianyiliu)
- **LinkedIn:** [qianyi-liu-544783414](https://www.linkedin.com/in/qianyi-liu-544783414)

## Google Scholar Citation Automation

The AcadHomepage Google Scholar crawler is retained. To enable automated citation updates on GitHub Pages, configure the repository secret `GOOGLE_SCHOLAR_ID` with the value `UmPI1h0AAAAJ`. The workflow uses the built-in `GITHUB_TOKEN`; no private token is stored in the site files.
