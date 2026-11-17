---
permalink: /
title: "Qianyi Liu"
excerpt: "Qianyi Liu studies landslide and flood susceptibility using geospatial AI, remote sensing, and hydrodynamic modeling at Stony Brook University."
academic_home: true
redirect_from:
  - /about/
  - /about.html
---

{% assign author = site.author %}
<header class="academic-profile" id="about-me">
  <div class="academic-wrap profile-grid">
    <img class="profile-portrait" src="{{ author.avatar | relative_url }}" width="200" height="240" alt="Qianyi Liu">
    <div class="profile-text">
      <p class="affiliation">{{ author.employer }} <span>Department of Civil Engineering</span></p>
      <h1>{{ author.name }}</h1>
      <p class="identity">{{ author.bio }} | Geospatial AI, Geohazards, Remote Sensing, and Machine Learning</p>
      <p class="bio">I study where landslides and floods are likely to occur and which environmental factors help explain their distribution. I combine remote sensing, GIS, hydrodynamic modeling, and machine learning to build and test susceptibility maps, especially where observations are sparse.</p>
      <div class="profile-links">
        <a class="cv-action" href="{{ author.cv | relative_url }}" download><i class="fas fa-file-download" aria-hidden="true"></i> Download CV</a>
        <a href="{{ author.googlescholar | escape }}"><i class="fas fa-graduation-cap" aria-hidden="true"></i> Google Scholar</a>
        <a href="mailto:{{ author.email }}"><i class="fas fa-envelope" aria-hidden="true"></i> Email</a>
      </div>
    </div>
  </div>
</header>

<div class="academic-wrap">
  <div class="work-and-news">
    <section id="publications">
      <h2><i class="fas fa-book-open" aria-hidden="true"></i> Publications</h2>
      {% assign selected = site.data.publications | where_exp: "p", "p.status != 'Under Review'" | where: "selected", true %}
      {% assign other = site.data.publications | where_exp: "p", "p.status != 'Under Review'" | where_exp: "p", "p.selected != true" %}
      {% assign review = site.data.publications | where: "status", "Under Review" %}
      {% include paper-list.html papers=selected label="Selected publications" %}
      {% include paper-list.html papers=other label="Other publications" %}
      {% include paper-list.html papers=review label="Manuscripts under review" %}
      <a class="text-link" href="{{ author.googlescholar | escape }}">Full publication list on Google Scholar <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>
    </section>
    <aside id="awards-news">
      <h2><i class="fas fa-award" aria-hidden="true"></i> News &amp; Awards</h2>
      <ul class="news-list">{% for item in site.data.news %}{% unless item.date == "TODO" %}
        <li><span class="year">{{ item.date }}</span><p>{% if item.url %}<a href="{{ item.url }}">{{ item.text | escape }}</a>{% else %}{{ item.text | escape }}{% endif %}</p></li>
      {% endunless %}{% endfor %}</ul>
    </aside>
  </div>

  <section class="academic-section" id="research">
    <h2><i class="fas fa-microscope" aria-hidden="true"></i> Research</h2>
    <div class="research-columns">{% for theme in site.data.research %}
      <article><h3>{{ theme.title }}</h3><p>{{ theme.description }}</p>
        <p class="keywords">{{ theme.keywords | join: " &middot; " }}</p>
      </article>
    {% endfor %}</div>
  </section>

  <section class="academic-section" id="projects">
    <h2><i class="fas fa-layer-group" aria-hidden="true"></i> Projects</h2>
    {% for project in site.data.projects %}
    <article class="project-row">
      <p class="project-state">{{ project.status }}</p>
      <div><h3>{{ project.title }}</h3><p>{{ project.summary }}</p>
        <details class="project-details"><summary>Methods and outputs</summary>
          <p><strong>Methods</strong> &middot; {{ project.methods }}</p>
          <p><strong>Outputs</strong> &middot; {{ project.outputs }}</p>
        </details>
        {% for link in project.links %}<a class="text-link" href="{{ link.url }}">{{ link.label }} <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>{% endfor %}
      </div>
    </article>
    {% endfor %}
  </section>

  <div class="academic-section service-grid">
    <section id="teaching">
      <h2><i class="fas fa-chalkboard-teacher" aria-hidden="true"></i> Teaching</h2>
      {% for item in site.data.teaching %}
      <article><h3>{{ item.course }}</h3><p>{{ item.role }}, {{ item.institution }}{% unless item.semester contains "TODO" %}, {{ item.semester }}{% endunless %}.</p>
        {% unless item.description contains "TODO" %}<p>{{ item.description }}</p>{% endunless %}
      </article>{% endfor %}
    </section>
    <section id="cv">
      <h2><i class="fas fa-file-alt" aria-hidden="true"></i> Curriculum vitae</h2>
      <p>{{ author.bio }}, {{ author.employer }}.</p>
      <a class="text-link" href="{{ author.cv | relative_url }}" download>Download CV (PDF) <i class="fas fa-download" aria-hidden="true"></i></a>
      <details class="project-details"><summary>Technical skills</summary>
        <p><strong>Programming</strong> &middot; Python, MATLAB, R, SQL</p>
        <p><strong>Geospatial tools</strong> &middot; ArcGIS Pro, ArcMap, Google Earth Engine, QGIS</p>
        <p><strong>Machine learning</strong> &middot; scikit-learn, PyTorch, XGBoost, LightGBM, CatBoost</p>
      </details>
    </section>
  </div>
</div>

<footer class="contact-band" id="contact"><div class="academic-wrap">
  <h2><i class="fas fa-envelope" aria-hidden="true"></i> Contact</h2>
  <p>Department of Civil Engineering, {{ author.employer }} &middot; {{ author.location }}</p>
  <div class="contact-links"><a href="mailto:{{ author.email }}">{{ author.email }}</a>
    <a href="{{ author.googlescholar | escape }}">Google Scholar</a>
    <a href="{{ author.orcid }}">ORCID</a><a href="https://github.com/{{ author.github }}">GitHub</a>
    <a href="https://www.linkedin.com/in/{{ author.linkedin }}">LinkedIn</a>
  </div>
</div></footer>
