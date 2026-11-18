// Run against a local preview with at least one real figure and the partial imported:
// node _tests/publication-figures.cjs http://127.0.0.1:4000/
const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4000/';

async function checkScale(stage, actual, x = .5, y = .5, fittedBox) {
  const view = await stage.evaluate(el => {
    const img = el.querySelector('img'), box = img.getBoundingClientRect();
    return {w:el.clientWidth, h:el.clientHeight, left:el.scrollLeft, top:el.scrollTop,
      iw:box.width, ih:box.height, nw:img.naturalWidth, nh:img.naturalHeight};
  });
  const near = (a,b,label,tolerance = 2) => assert.ok(Math.abs(a-b) < tolerance, label + ': ' + a + ' vs ' + b);
  if (actual) {
    near(view.iw,view.nw,'1:1 width'); near(view.ih,view.nh,'1:1 height');
    const offset = (p,n,v) => Math.max(0,Math.min(n-v,p*n-v/2));
    // Native pointer coordinates may be rounded by one fitted CSS pixel before zoom.
    near(view.left,offset(x,view.nw,view.w),'horizontal detail position',2+(fittedBox ? view.nw/fittedBox.width : 0));
    near(view.top,offset(y,view.nh,view.h),'vertical detail position',2+(fittedBox ? view.nh/fittedBox.height : 0));
  } else {
    const scale = Math.min(1,view.w/view.nw,view.h/view.nh);
    near(view.iw,view.nw*scale,'fitted width'); near(view.ih,view.nh*scale,'fitted height');
    near(view.left,0,'fit resets horizontal offset'); near(view.top,0,'fit resets vertical offset');
  }
}

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
      const touch = width === 390;
      const page = await browser.newPage({viewport:{width,height:900},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
      await page.goto(base.split('#')[0]+'#publications');
      const links = page.locator('.paper-original'), viewer = page.locator('.figure-viewer');
      const stage = viewer.locator('.figure-canvas'), img = stage.locator('img');
      const zoom = viewer.locator('[data-zoom]');
      assert.ok(await links.count());
      if (output) {
        await links.first().locator('img').evaluate(img=>img.decode());
        await page.screenshot({path:join(output,width+'-papers.jpg'),quality:86});
      }
      for (const link of await links.all()) {
        const label = link.getByText('Open original'), plate = link.locator('.paper-figure-plate');
        await link.scrollIntoViewIfNeeded();
        assert.ok(await label.isVisible(), 'action visible without hover');
        if (touch) {
          assert.ok(await page.evaluate(() => matchMedia('(hover: none)').matches));
          await label.tap();
        } else {
          await link.hover();
          const corner = await plate.evaluate(el => getComputedStyle(el,'::before').borderTopColor);
          assert.notEqual(corner,'rgba(0, 0, 0, 0)','visible registration mark on hover');
          const frameOnly = await link.evaluate(el => {
            const image = getComputedStyle(el.querySelector('img'));
            return image.filter === 'none' && image.transform === 'none' && image.opacity === '1' &&
              getComputedStyle(el).boxShadow === 'none' && !el.getAnimations({subtree:true}).length;
          });
          assert.ok(frameOnly,'hover leaves the image unchanged, without a halo or motion');
          const bounds = await link.boundingBox();
          await page.mouse.down();
          assert.equal(await link.locator('.paper-figure-bar').evaluate(el=>getComputedStyle(el).borderInlineStartColor),
                       await link.evaluate(el=>getComputedStyle(el).borderLeftColor),'pressed edge');
          assert.deepEqual(await link.boundingBox(),bounds,'no layout jump on press');
          await page.mouse.up();
        }
        await viewer.waitFor();
        await img.evaluate(el=>el.decode());
        assert.equal(await img.getAttribute('src'),await link.evaluate(el=>el.href));
        assert.equal(await viewer.locator('[data-figure-file]').getAttribute('href'),await link.evaluate(el=>el.href));
        await checkScale(stage,false);
        const box = await img.boundingBox();
        const canvas = await stage.boundingBox();
        // In fit mode the letterbox belongs to the canvas, not the image hit target.
        if (box.y - canvas.y > 6 || box.x - canvas.x > 6) {
          const margin = box.y - canvas.y > 6 ? {x:canvas.width/2,y:2} : {x:2,y:canvas.height/2};
          if (touch) await stage.tap({position:margin}); else await stage.click({position:margin});
          assert.equal(await zoom.getAttribute('aria-pressed'),'false','clicking the margin does not zoom');
        }
        const position = {x:Math.floor(box.width*.78),y:Math.floor(box.height*.72)};
        if (touch) await img.tap({position}); else await img.click({position});
        assert.equal(await zoom.getAttribute('aria-pressed'),'true');
        await checkScale(stage,true,position.x/box.width,position.y/box.height,box);
        if (touch) await stage.tap(); else await stage.click();
        await checkScale(stage,false);
        await zoom.focus(); await page.keyboard.press('Space');
        assert.ok(await stage.evaluate(el=>el===document.activeElement),'keyboard can pan the stage');
        assert.equal(await zoom.getAttribute('aria-label'),'Fit to window');
        await checkScale(stage,true);
        const left = await stage.evaluate(el=>el.scrollLeft);
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(old=>document.activeElement.scrollLeft > old,left);
        await zoom.focus(); await page.keyboard.press('Enter');
        assert.equal(await zoom.getAttribute('aria-label'),'Show actual size');
        await checkScale(stage,false);
        await page.keyboard.press('Escape');
        await viewer.waitFor({state:'hidden'});
        assert.ok(await link.evaluate(el=>el===document.activeElement && el.hasAttribute('data-inspected')));
        assert.equal(await page.locator('.paper-original[data-inspected]').count(),1,'only last figure marked');
      }
      await page.close(); console.log(width+'px: detail zoom, keyboard zoom, focus return and selection passed');
    }
    const pointerPage = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
    await pointerPage.goto(base.split('#')[0]+'#publications');
    const preview = pointerPage.locator('.paper-original').first(), plate = preview.locator('.paper-figure-plate');
    await preview.hover();
    await pointerPage.waitForFunction(()=>getComputedStyle(document.querySelector('.paper-figure-plate'),'::before').transform==='none');
    assert.equal(await plate.evaluate(el=>getComputedStyle(el,'::before').transitionDuration),'0.15s');
    assert.equal(await preview.locator('img').evaluate(el=>getComputedStyle(el).transform),'none');
    if (output) await preview.screenshot({path:join(output,'paper-hover.png')});
    await preview.click(); await pointerPage.getByRole('button',{name:'Close figure',exact:true}).click();
    await pointerPage.mouse.move(0,0); assert.ok(await preview.evaluate(el=>el.hasAttribute('data-inspected')));
    if (output) await preview.screenshot({path:join(output,'paper-inspected.png')});
    await pointerPage.close(); console.log('PASS pointer corner feedback and inspected frame');
    const page = await browser.newPage({forcedColors:'active',reducedMotion:'reduce'});
    await page.goto(base);
    const link = page.locator('.paper-original').first(), viewer = page.locator('.figure-viewer');
    const href = await link.evaluate(el=>el.href), zoom = viewer.locator('[data-zoom]');
    const caption = await link.locator('..').locator('figcaption p').innerText();
    await page.route(href, route=>route.fulfill({status:404,body:''}),{times:1});
    await page.keyboard.press('Tab'); await link.focus();
    assert.ok(await link.evaluate(el=>el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth)>=2));
    await page.keyboard.press('Enter');
    await viewer.getByText('The original image could not be loaded.',{exact:false}).waitFor();
    assert.ok(await zoom.isDisabled());
    assert.ok(!await viewer.locator('.figure-canvas').isVisible());
    assert.ok((await viewer.locator('[data-figure-caption]').innerText()).includes(caption),'caption preserved on error');
    assert.equal(await viewer.getByRole('link',{name:'Original image'}).getAttribute('href'),href);
    await viewer.getByRole('button',{name:'Close figure'}).click();
    await viewer.waitFor({state:'hidden'});
    assert.ok(await link.evaluate(el=>el===document.activeElement));
    await page.keyboard.press('Enter');
    await viewer.locator('img').evaluate(el=>el.decode());
    assert.equal(await viewer.locator('[data-figure-caption]').innerText(),caption,'retry clears error');
    await zoom.click();
    assert.equal(await zoom.evaluate(el=>getComputedStyle(el).borderTopStyle),'double','forced-colors zoom indicator');
    await checkScale(viewer.locator('.figure-canvas'),true);
    await page.keyboard.press('Escape');
    await page.close(); console.log('Forced colors, keyboard opener, original failure and successful retry passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
