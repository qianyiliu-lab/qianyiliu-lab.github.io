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
<header id="about-me" class="estuary">
  <picture>
    <source media="(max-width: 700px)" srcset="{{ '/images/barry-arm-mobile-720.webp' | relative_url }} 720w, {{ '/images/barry-arm-mobile-1600.webp' | relative_url }} 1600w" sizes="(max-width: 480px) 480px, 100vw" data-lens-src="{{ '/images/barry-arm-mobile-1600.webp' | relative_url }}">
    <img src="{{ '/images/barry-arm-1440.webp' | relative_url }}" srcset="{{ '/images/barry-arm-1440.webp' | relative_url }} 1440w, {{ '/images/barry-arm-2560.webp' | relative_url }} 2560w, {{ '/images/barry-arm-3840.webp' | relative_url }} 3840w, {{ '/images/barry-arm-detail.webp' | relative_url }} 6144w" sizes="(max-width: 1400px) 1400px, 100vw" data-lens-src="{{ '/images/barry-arm-detail.webp' | relative_url }}" width="1440" height="415" fetchpriority="high" alt="Steep slopes and glacier ice above the water at the Barry Arm landslide in Alaska.">
  </picture>
  <img class="relief-image" width="1920" height="1080" data-src="{{ '/images/barry-arm-relief.webp' | relative_url }}" data-bounds='{{ site.data.barry_arm_terrain | jsonify }}' alt="North-up shaded relief of Barry Arm, Alaska, with elevation contours at 100 metre intervals." hidden>
  <div class="measure cover-inner">
    <p class="institution">{{ author.employer }}</p>
    <h1>{{ author.name }}</h1>
    <p class="role">{{ author.bio }}</p>
    <p class="fields">Geohazards, geospatial AI, remote sensing, and machine learning</p>
    <div class="cover-actions">
      <button class="ask-launch" type="button" aria-haspopup="dialog" aria-controls="research-qa" hidden>{% include academic-icon.html name="chat" %}<span>Ask about my research</span></button>
      <a class="cover-cv" href="{{ author.cv | relative_url }}" download>{% include academic-icon.html name="download" %} Download CV</a>
    </div>
  </div>
  <div class="view-strip"><div class="measure view-row">
    <div class="view-site"><strong>Barry Arm, Alaska</strong><span data-coordinate title="Approximate location of the landslide toe">61.10&deg; N &nbsp;148.17&deg; W</span></div>
    <div class="view-switch" role="group" aria-label="Landscape view" hidden>
      <button type="button" data-view="photo" aria-pressed="true">Photo</button>
      <button type="button" data-view="terrain" aria-pressed="false">Terrain</button>
    </div>
    <span class="view-source">
      <a data-credit="photo" href="https://www.usgs.gov/media/images/panorama-view-barry-arm-landslide">Tony Fischbach / USGS</a>
      <a data-credit="terrain" href="https://www.usgs.gov/3d-elevation-program/about-3dep-products-services" hidden>USGS 3DEP &middot; 100 m contours</a>
    </span>
    <span class="view-scale" hidden role="img" aria-label="North up; approximate 1 kilometre scale"><span aria-hidden="true">N &uarr;</span><span class="scale-bar" aria-hidden="true">1 km</span></span>
    <span class="sr-only" role="status" data-view-status></span>
  </div></div>
</header>

<div class="measure introduction">
  <section class="bio" aria-labelledby="profile-heading">
    <img src="{{ author.avatar | relative_url }}" width="86" height="104" alt="Portrait of Qianyi Liu">
    <div><h2 id="profile-heading">About me</h2>
      <p>I study where landslides and floods are likely to occur, and which environmental factors explain their distribution. At Stony Brook University, I combine remote sensing, GIS, and hydrodynamic modeling with machine learning to map susceptibility and test how well those maps hold up in new places.</p>
      <div class="bio-actions">
        {% include profile-links.html scholar="true" label="Email and academic profiles" %}
      </div>
    </div>
  </section>
  <aside id="awards-news"><h2>News &amp; awards</h2>
    <ul class="news">{% for item in site.data.news %}{% unless item.date == "TODO" %}
      <li><span class="meta">{{ item.date }}</span><span>{% if item.url %}<a href="{{ item.url }}">{{ item.text | escape }}</a>{% else %}{{ item.text | escape }}{% endif %}</span></li>
    {% endunless %}{% endfor %}</ul>
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
</div></section>

<section class="band" id="research"><div class="measure">
  <div class="section-heading"><h2>Research directions</h2></div>
  <div class="research-grid">{% for theme in site.data.research %}
    <article><h3>{{ theme.title }}</h3><p>{{ theme.description }}</p></article>
  {% endfor %}</div>
</div></section>

<section class="band" id="projects"><div class="measure">
  <div class="section-heading"><h2>Projects</h2></div>
  {% for project in site.data.projects %}
  <article class="project"><p class="meta">{{ project.status }}</p><div><h3>{{ project.title }}</h3><p>{{ project.summary }}</p>
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
  {% include profile-links.html scholar="true" label="Contact and academic profiles" %}
</div></footer>
