---
permalink: /
title: "Qianyi Liu"
excerpt: "Qianyi Liu studies landslide and flood susceptibility using geospatial AI, remote sensing, and hydrodynamic modeling at Stony Brook University."
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

<span class="anchor" id="about-me"></span>

<div class="homepage-intro" markdown="1">
<div class="intro-lead" markdown="1">
I am a PhD student in Civil Engineering at Stony Brook University. My research focuses on geohazard susceptibility assessment, remote sensing, GIS, and machine learning/deep learning methods for landslide and flood risk analysis. I am particularly interested in integrating geospatial data, physically meaningful environmental predictors, and explainable AI to improve the reliability and interpretability of hazard susceptibility mapping.

{% include intro-terrain.html %}
</div>

**Research interests:** Geohazards, landslide susceptibility mapping, flood susceptibility assessment, remote sensing, GIS, machine learning, deep learning, explainable AI, self-supervised learning, and spatial validation.
</div>

<h1 id="awards-news">{% include academic-icon.html name="awards" %} News &amp; Awards</h1>

{% for item in site.data.news %}
{% unless item.date == "TODO" %}
- *{{ item.date }}* {% if item.url %}[{{ item.text }}]({{ item.url }}){% else %}{{ item.text }}{% endif %}
{% endunless %}
{% endfor %}

<h1 id="research">{% include academic-icon.html name="research" %} Research</h1>

My research develops data-driven and physically informed methods for understanding and mapping natural hazards. Current directions include:

<div class="research-list">
{% for theme in site.data.research %}
  <section class="research-theme" markdown="1">
  <h3>{{ forloop.index }}. {{ theme.title }}</h3>

  {{ theme.description }}

  <p class="research-keywords"><strong>Keywords:</strong> {{ theme.keywords | join: ", " }}.</p>
  </section>
{% endfor %}
</div>

<h1 id="publications">{% include academic-icon.html name="publications" %} Publications</h1>

## Selected Publications

{% assign selected_pubs = site.data.publications | where: "selected", true %}
{% for pub in selected_pubs %}
<article class="publication-entry" markdown="1">
### {% if pub.doi %}[{{ pub.title }}](https://doi.org/{{ pub.doi }}){% else %}{{ pub.title }}{% endif %}

{{ pub.authors | markdownify }}

*{{ pub.venue }}*, {{ pub.year }}.{% if pub.doi %} [DOI](https://doi.org/{{ pub.doi }}){% endif %}{% if pub.pdf %} | [PDF]({{ pub.pdf }}){% endif %}{% if pub.code %} | [Code]({{ pub.code }}){% endif %}{% if pub.data %} | [Data]({{ pub.data }}){% endif %}{% if pub.bibtex %} | [BibTeX]({{ pub.bibtex }}){% endif %}{% if pub.scholar_id %} <span class="show_paper_citations" data-scholar-id="{{ pub.scholar_id }}">Citations unavailable</span>{% endif %}
</article>
{% endfor %}

## Manuscripts Under Review

{% assign under_review_pubs = site.data.publications | where: "status", "Under Review" %}
{% for pub in under_review_pubs %}
<article class="publication-entry" markdown="1">
### {{ pub.title }}

{{ pub.authors | markdownify }}

Submitted to *{{ pub.venue }}*, {{ pub.year }}. **Status: {{ pub.status }}.**
</article>
{% endfor %}

<h1 id="projects">{% include academic-icon.html name="projects" %} Projects</h1>

<div class="project-list">
{% for project in site.data.projects %}
  <article class="project-entry" markdown="1">
  <p class="project-status">{{ project.status }}</p>

  <h2>{{ project.title }}</h2>

  {{ project.summary }}

  **Methods and tools:** {{ project.methods }}

  **Representative outputs:** {{ project.outputs }}

  {% if project.links and project.links.size > 0 %}
  <p class="resource-links">
  {% for link in project.links %}<a href="{{ link.url }}">{{ link.label }}</a>{% unless forloop.last %}<span aria-hidden="true"> / </span>{% endunless %}{% endfor %}
  </p>
  {% endif %}
  </article>
{% endfor %}
</div>

<h1 id="teaching">{% include academic-icon.html name="teaching" %} Teaching</h1>

{% for item in site.data.teaching %}
- **{{ item.role }}, {{ item.course }}**, {{ item.institution }}{% unless item.semester contains "TODO" %}, {{ item.semester }}{% endunless %}.{% unless item.description contains "TODO" %} {{ item.description }}{% endunless %}
{% endfor %}

<h1 id="cv">{% include academic-icon.html name="cv" %} CV</h1>

<p><a class="btn btn--primary cv-download" href="/assets/pdf/Qianyi_Liu_CV.pdf" download="Qianyi_Liu_CV.pdf">{% include academic-icon.html name="download" %} Download CV</a></p>

## Education

- **PhD Student in Civil Engineering**, Stony Brook University.

## Research Experience

- Geohazard susceptibility assessment, remote sensing, GIS, and machine learning/deep learning for landslide and flood risk analysis.

## Awards

- First Place, Individual Poster Presentation, NSF NHERI GSC Mini-Conference, 2026.

## Technical Skills

- **Programming:** Python, MATLAB, R, SQL
- **Geospatial tools:** ArcGIS Pro, ArcMap, Google Earth Engine, QGIS
- **Machine learning and deep learning:** scikit-learn, PyTorch, XGBoost, LightGBM, CatBoost
- **Research methods:** Remote sensing, geospatial analysis, hydrodynamic modeling, and geohazard susceptibility mapping

<h1 id="contact">{% include academic-icon.html name="email" %} Contact</h1>

- **Email:** [qianyi.liu@stonybrook.edu](mailto:qianyi.liu@stonybrook.edu)
- **Affiliation:** Department of Civil Engineering, Stony Brook University
- **Location:** Stony Brook, NY, USA
- **Profiles:** [Google Scholar](https://scholar.google.com/citations?user=UmPI1h0AAAAJ&hl=en&authuser=2) / [ORCID](https://orcid.org/0009-0006-0161-4639) / [GitHub](https://github.com/qianyiliu) / [LinkedIn](https://www.linkedin.com/in/qianyi-liu-544783414)
