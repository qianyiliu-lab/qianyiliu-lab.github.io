// Check the biography, its reading links, and the header without calling the Worker.
const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:4000/';
  const output = process.argv[3];
  if (output) await mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel:process.env.QA_BROWSER || 'msedge'});
  try {
    for (const width of [320,390,768,961,1024,1440]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      await page.route('https://*.workers.dev/**',route=>route.abort());
      await page.goto(url.split('#')[0]+'#biography');
      const bio = page.locator('#biography'), lead = bio.locator('.bio-lead'), detail = bio.locator('.bio-detail');
      await bio.locator('img').evaluate(img=>img.decode());
      assert.ok((await lead.innerText()).startsWith('I '));
      assert.ok(await lead.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>parseFloat(getComputedStyle(el.nextElementSibling).fontSize)));
      assert.ok((await detail.boundingBox()).y >= (await lead.boundingBox()).y+(await lead.boundingBox()).height);
      assert.ok(await bio.locator('.profile-links a').count()===5);
      assert.ok(await page.locator('.news li').count()>0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'body fits at '+width);
      const nav = page.locator('.desktop-nav');
      if (await nav.isVisible()) {
        const right = (await nav.boundingBox()).x+(await nav.boundingBox()).width;
        assert.ok(right<=width,'all navigation items on screen at '+width);
      } else {
        await page.locator('.mobile-nav summary').click();
        await page.locator('.mobile-nav').getByRole('link',{name:'About',exact:true}).click();
        assert.ok(!await page.locator('.mobile-nav').evaluate(el=>el.open));
      }
      if (output && [390,768,1440].includes(width)) {
        await page.screenshot({path:join(output,width+'-biography.jpg'),quality:86});
      }
      for (const a of await detail.locator('a').all()) {
        const hash = await a.getAttribute('href');
        await a.focus(); await page.keyboard.press('Enter');
        assert.equal(new URL(page.url()).hash,hash);
        const target = page.locator(hash); assert.ok(await target.isVisible());
        assert.ok((await target.boundingBox()).y>=(await page.locator('.mast').boundingBox()).height-1);
      }
      if (width===320 || width===768) {
        await page.evaluate(()=>document.documentElement.style.fontSize='200%');
        assert.ok(await bio.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'bio reflows with large type');
        assert.ok(await page.locator('#awards-news').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      }
      console.log('PASS biography, anchors and navigation at '+width+'px'); await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
