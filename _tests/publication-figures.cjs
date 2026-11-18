// Run against a local preview with at least one real figure and the partial imported:
// node _tests/publication-figures.cjs http://127.0.0.1:4000/
const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4000/';

(async () => {
  const output = process.argv[3]; if (output) await mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel: process.env.QA_BROWSER || 'msedge'});
  try {
    for (const width of [320, 390, 1024, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 900}, javaScriptEnabled: false});
      await page.goto(base);
      const papers = page.locator('#publications');
      const review = papers.locator('.review-list');
      if (await review.count()) {
        await review.locator('summary').click();
        assert.equal(await review.locator('figure, .paper-ask').count(), 0);
      }
      assert.equal(await papers.locator('.paper-ask:visible, h4 img, .authors img').count(), 0);
      assert.ok(await papers.locator('.paper-original').count(), 'No published figure to test');

      const originals = [];
      for (const paper of await papers.locator('.paper').all()) {
        const record = paper.locator('.paper-record');
        const bounds = await paper.boundingBox();
        const text = await record.boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'entry fits viewport');
        assert.ok(await paper.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'no content overflow');
        const title = record.locator('h4 a');
        if (await title.count()) {
          const doi = await title.getAttribute('href');
          assert.match(doi, /^https:\/\/doi\.org\//);
          assert.equal(await record.getByRole('link', {name: 'DOI', exact: true}).getAttribute('href'), doi);
          assert.ok((await record.locator('.authors').innerText()).trim());
          assert.ok((await record.locator('.journal').innerText()).trim());
          if (!await paper.locator('xpath=ancestor::details').count()) {
            assert.ok(await paper.getAttribute('id'));
            assert.equal(await record.locator('.paper-ask').getAttribute('aria-controls'), 'research-qa');
          }
        }
        const figure = paper.locator('figure');
        if (!await figure.count()) {
          assert.ok(Math.abs(text.width - bounds.width) < 2, 'no empty figure column');
          continue;
        }
        const box = await figure.boundingBox();
        if (width < 760) assert.ok(box.y >= text.y + text.height - 1, 'mobile figure follows citation');
        else assert.ok(box.x >= text.x + text.width - 1, 'desktop figure beside citation');
        const link = figure.locator('a.paper-original');
        const img = link.locator('img');
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(el => el.decode());
        const actual = await img.evaluate(el => ({
          src: el.currentSrc, href: el.closest('a').href, alt: el.alt,
          ratio: el.naturalWidth / el.naturalHeight,
          rendered: el.clientWidth / el.clientHeight,
          fit: getComputedStyle(el).objectFit
        }));
        assert.ok(actual.alt.trim());
        assert.equal(new URL(actual.href).origin,new URL(actual.src).origin,'images served by homepage');
        assert.equal(actual.src.replace('-preview.', '.'),actual.href,'thumbnail opens the full published figure');
        assert.ok(Math.abs(actual.rendered / actual.ratio - 1) < .02, 'figure retains native proportions');
        assert.equal(actual.fit, 'contain');
        originals.push(actual.href);
      }
      // Follow each native link with scripting disabled; a 200 HTML fallback is not an image.
      for (const [index, href] of originals.entries()) {
        const link = papers.locator('.paper-original').nth(index);
        const [response] = await Promise.all([
          page.waitForResponse(r => r.url() === href && r.request().isNavigationRequest()),
          link.click()
        ]);
        assert.ok(response.ok(), 'original image is reachable');
        assert.match(response.headers()['content-type'], /^image\//);
        await page.goBack();
      }
      await page.close();
      console.log(width + 'px: layout and original links passed without JavaScript');
    }
    for (const width of [390,1440]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      await page.goto(base.split('#')[0]+'#publications');
      const links = page.locator('.paper-original'), viewer = page.locator('.figure-viewer');
      if (output) {
        await links.first().locator('img').evaluate(img=>img.decode());
        await page.screenshot({path:join(output,width+'-papers.jpg'),quality:86});
      }
      for (const link of await links.all()) {
        await link.click(); await viewer.waitFor(); const img=viewer.locator('img');
        await img.evaluate(el=>el.decode());
        assert.equal(await img.getAttribute('src'),await link.evaluate(el=>el.href));
        await viewer.getByRole('button',{name:'Show actual size'}).click();
        assert.ok(await viewer.locator('.figure-canvas').evaluate(el=>el.scrollWidth>el.clientWidth));
        await viewer.getByRole('button',{name:'Fit to window'}).click();
        assert.ok(await viewer.locator('.figure-canvas').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
        await page.keyboard.press('Escape');
        assert.ok(!await viewer.isVisible());assert.ok(await link.evaluate(el=>el===document.activeElement));
      }
      await page.close(); console.log(width+'px: both figure viewers, fit, actual size and focus return passed');
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
