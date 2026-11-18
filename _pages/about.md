---
layout: profile
permalink: /
title: "Qianyi Liu"
excerpt: "Qianyi Liu studies landslide and flood susceptibility using geospatial AI, remote sensing, and hydrodynamic modeling at Stony Brook University."
redirect_from:
  - /about/
  - /about.html
---

{% assign author = site.author %}
<header id="about-me" class="estuary" data-view="satellite">
  <picture>
    <img src="{{ '/images/barry-arm-satellite.webp' | relative_url }}" srcset="{{ '/images/barry-arm-satellite-960.webp' | relative_url }} 960w, {{ '/images/barry-arm-satellite.webp' | relative_url }} 1920w" sizes="(max-width: 700px) 900px, 100vw" data-lens-src="{{ '/images/barry-arm-satellite.webp' | relative_url }}" width="1920" height="1080" fetchpriority="high" alt="Satellite view of Barry Arm, Alaska: glacier ice and snow-covered ridges flank a narrow fjord.">
  </picture>
  <img class="relief-image" width="1920" height="1080" data-src="{{ '/images/barry-arm-relief.webp' | relative_url }}" data-bounds='{{ site.data.barry_arm_terrain | jsonify }}' alt="North-up shaded relief of Barry Arm, Alaska, with elevation contours at 100 metre intervals." hidden>
  <div class="measure cover-inner">
    <p class="institution">{{ author.employer }}</p>
    <h1>{{ author.name }}</h1>
    <p class="role">{{ author.bio }}</p>
    <p class="fields">Geohazards, geospatial AI, remote sensing, and machine learning</p>
    <div class="cover-actions">
      <a class="cover-papers" href="#publications">View papers {% include academic-icon.html name="arrow-right" %}</a>
      <button class="ask-launch" type="button" aria-haspopup="dialog" aria-controls="research-qa" hidden>{% include academic-icon.html name="chat" %}<span>Ask about my research</span></button>
    </div>
  </div>
  <div class="view-strip"><div class="measure view-row">
    <div class="view-site"><strong>Barry Arm, Alaska</strong><span data-coordinate title="Approximate NAD83 map coordinate">61.116&deg; N &nbsp;148.208&deg; W</span></div>
    <button type="button" class="survey-toggle" aria-pressed="false" hidden><span aria-hidden="true"></span>Survey lens</button>
    <div class="view-switch" role="group" aria-label="Landscape view" hidden>
      <button type="button" data-view="satellite" aria-pressed="true">Satellite</button>
      <button type="button" data-view="terrain" aria-pressed="false">Terrain</button>
      <button type="button" class="view-play" aria-label="Play layer comparison" title="Play layer comparison"><span data-play-icon>{% include academic-icon.html name="play" %}</span><span data-pause-icon hidden>{% include academic-icon.html name="pause" %}</span></button>
    </div>
    <span class="view-source">
      <a data-credit="satellite" href="https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2B_6VVN_20240719_0_L2A" title="Contains modified Copernicus Sentinel data (2024)">Copernicus Sentinel-2 &middot; 19 Jul 2024</a>
      <a data-credit="terrain" href="https://www.usgs.gov/3d-elevation-program/about-3dep-products-services" hidden>USGS 3DEP &middot; 100 m contours</a>
    </span>
    <span class="view-scale" hidden role="img" aria-label="North up; approximate 1 kilometre scale"><span aria-hidden="true">N &uarr;</span><span class="scale-bar" aria-hidden="true">1 km</span></span>
    <span class="sr-only" role="status" data-view-status></span>
  </div></div>
</header>

<div class="measure introduction">
  <section id="biography" class="bio" aria-labelledby="profile-heading">
    <h2 id="profile-heading">About me</h2>
    <img src="{{ author.avatar | relative_url }}" width="1279" height="1288" decoding="async" alt="Portrait of Qianyi Liu">
    <p class="bio-lead">I use terrain and satellite data to study where landslides and floods are likely to occur.</p>
    <p class="bio-detail">My colleagues and I used simulations of 78 tropical cyclones to <a href="#paper-{{ '10.1016/j.gsf.2026.102355' | slugify }}">map flood susceptibility in the Pearl River Delta</a>. In my <a href="#landslide-transfer">current landslide research</a>, I ask whether a model trained in one region can identify susceptible slopes in another, where records are sparse.</p>
    <div class="bio-actions">
      {% include profile-links.html scholar="true" label="Email and academic profiles" %}
    </div>
  </section>
  <aside id="awards-news" aria-labelledby="news-heading"><h2 id="news-heading">News &amp; awards</h2>
    {% assign dated_news = site.data.news | where_exp: "item", "item.date != 'TODO'" | group_by: "date" %}
    <dl class="news">{% for group in dated_news %}
      <div><dt class="meta">{{ group.name | escape }}</dt><dd><ul>{% for item in group.items %}
        <li>{{ item.text | escape }}{% if item.url %} <a href="{{ item.url | escape }}">{{ item.link_label | default: 'Read more' | escape }}</a>{% endif %}</li>
      {% endfor %}</ul></dd></div>
    {% endfor %}</dl>
  </aside>
</div>

<section class="band papers" id="publications"><div class="measure">
  <div class="section-heading"><h2>Publications</h2>
    <a href="{{ author.googlescholar | escape }}">Full list on Google Scholar</a>
  </div>
  <div class="pub-body">
  {% assign published = site.data.publications | where_exp: "p", "p.status != 'Under Review'" %}
  {% assign selected = published | where: "selected", true %}
  {% assign others = published | where_exp: "p", "p.selected != true" %}
  {% assign review = site.data.publications | where: "status", "Under Review" %}
  {% if selected.size > 0 %}<h3 class="{% if others.size > 0 %}subhead{% else %}sr-only{% endif %}">Selected publications</h3>{% include bibliography.html records=selected %}{% endif %}
  {% if others.size > 0 %}<h3 class="subhead">Other publications</h3>{% include bibliography.html records=others %}{% endif %}
  {% if review.size > 0 %}
  <details class="review-list"><summary>Manuscripts under review <span>({{ review.size }})</span></summary>{% include bibliography.html records=review %}</details>
  {% endif %}
  </div>
  <dialog class="figure-viewer" id="publication-figure" aria-labelledby="figure-heading">
    <div class="figure-tools">
      <div><p class="journal" data-figure-venue></p><h3 id="figure-heading">Publication figure</h3></div>
      <button type="button" data-zoom title="Show actual size" aria-label="Show actual size" aria-pressed="false">1:1</button>
      <button type="button" data-close title="Close figure" aria-label="Close figure" autofocus>{% include academic-icon.html name="close" %}</button>
    </div>
    <div class="figure-canvas" tabindex="0" role="region" aria-label="Figure detail"><img alt=""></div>
    <div class="figure-notes"><p data-figure-caption></p><a data-figure-file>Original image</a></div>
  </dialog>
</div></section>

<section class="band" id="research"><div class="measure">
  <div class="section-heading"><h2>Research directions</h2></div>
  <div class="research-grid">{% for theme in site.data.research %}
    {% assign related_project = site.data.projects | where: 'id', theme.project_id | first %}
    <article{% if theme.anchor %} id="{{ theme.anchor | escape }}"{% endif %}><h3>{{ theme.title }}</h3><p>{{ theme.description }}</p>
      {% if theme.project_id and related_project %}<a class="theme-project" href="#project-{{ related_project.id | escape }}">View project<span class="sr-only">: {{ related_project.title | escape }}</span> {% include academic-icon.html name="arrow-right" %}</a>{% endif %}
    </article>
  {% endfor %}</div>
</div></section>

<section class="band" id="projects"><div class="measure">
  <div class="section-heading"><h2>Projects</h2></div>
  {% for project in site.data.projects %}
  <article class="project"{% if project.id %} id="project-{{ project.id | escape }}"{% endif %}><p class="meta">{{ project.status }}</p><div><h3>{{ project.title }}</h3><p>{{ project.summary }}</p>
    <details><summary>Methods and outputs</summary><p><strong>Methods</strong> &middot; {{ project.methods }}</p><p><strong>Outputs</strong> &middot; {{ project.outputs }}</p></details>
    {% for link in project.links %}<a class="project-resource" href="{{ link.url }}">{% if link.label == 'DOI' %}Read the paper{% else %}{{ link.label }}{% endif %}</a>{% endfor %}
  </div></article>{% endfor %}
</div></section>

<div class="band"><div class="measure service">
  <section id="teaching"><h2>Teaching</h2>
    {% for course in site.data.teaching %}<div class="course"><h3>{{ course.course }}</h3><p>{{ course.role }}, {{ course.institution }}{% if course.semester %}{% unless course.semester contains "TODO" %}, {{ course.semester }}{% endunless %}{% endif %}.</p>
      {% if course.description %}{% unless course.description contains "TODO" %}<p>{{ course.description }}</p>{% endunless %}{% endif %}</div>{% endfor %}
  </section>
  <section id="cv"><h2>Curriculum vitae</h2>
    <p>{{ author.bio }}<br>Department of Civil Engineering, {{ author.employer }}</p>
    <a href="{{ author.cv | relative_url }}" download>Download CV (PDF) {% include academic-icon.html name="download" %}</a>
    <details><summary>Technical skills</summary><p>Python, MATLAB, R, SQL &middot; ArcGIS Pro, ArcMap, Google Earth Engine, QGIS &middot; scikit-learn, PyTorch, XGBoost, LightGBM, CatBoost.</p></details>
  </section>
</div></div>

<footer id="contact"><div class="measure foot">
  <div><h2>Contact</h2><a class="email" href="mailto:{{ author.email }}">{{ author.email }}</a>
    <p>Department of Civil Engineering, {{ author.employer }}<br>{{ author.location }}</p></div>
  <div class="foot-tools">{% include profile-links.html scholar="true" label="Contact and academic profiles" %}
    <a class="to-top" href="#about-me">Back to top {% include academic-icon.html name="arrow-up" %}</a>
  </div>
</div></footer>
