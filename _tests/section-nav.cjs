const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4000/', output = process.argv[3];

(async () => {
  if (output) await mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel:process.env.QA_BROWSER || 'msedge'});
  try {
    for (const width of [320,390,768,961,1440]) {
      const page = await browser.newPage({viewport:{width,height:850},hasTouch:width<800});
      await page.route('https://*.workers.dev/**',route=>route.abort());
      await page.goto(url);
      const nav = page.locator('.nav-row'), cv = nav.getByRole('link',{name:'Download CV (PDF)'});
      const menu = nav.locator('.mobile-nav'), trigger = menu.locator('summary');
      const papers = page.getByRole('link',{name:'View papers',exact:true});
      const ask = page.locator('.ask-launch'); await ask.waitFor();
      const [a,b] = await Promise.all([papers.boundingBox(),ask.boundingBox()]);
      assert.ok(a.height>=44 && b.height>=44 && Math.abs(a.y-b.y)<2,'hero actions aligned at '+width);
      assert.ok(b.x>=a.x+a.width && b.x+b.width<=width,'hero actions fit');
      assert.ok((await cv.boundingBox()).height>=44);
      assert.ok(await nav.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'nav fits');
      if (output) await page.screenshot({path:join(output,width+'-home.jpg'),quality:87});
      const upcoming = page.waitForEvent('download'); await cv.click();
      const download = await upcoming; assert.match(download.suggestedFilename(),/Qianyi_Liu_CV\.pdf/i);
      assert.equal(await download.failure(), null);
      await papers.click();
      const active = id=>nav.locator('a[aria-current="location"][href="#'+id+'"]').first().waitFor({state:'attached'});
      await active('publications');
      await page.locator('#research').scrollIntoViewIfNeeded();
      const themes = page.locator('.theme-project'); assert.equal(await themes.count(),3);
      for (const link of await themes.all()) {
        const dest = await link.getAttribute('href'); await link.click();
        assert.equal(new URL(page.url()).hash,dest); await active('projects');
      }
      if (await menu.isVisible()) {
        await trigger.focus(); await page.keyboard.press('Enter');
        assert.ok(await menu.evaluate(el=>el.open));
        await page.keyboard.press('Escape'); assert.ok(!await menu.evaluate(el=>el.open));
        assert.ok(await trigger.evaluate(el=>el===document.activeElement));
        await trigger.click(); await menu.getByRole('link',{name:'Awards & News'}).click();
        await active('awards-news');
        if (width===390) {
          const at = await page.evaluate(()=>scrollY);
          const pos = await trigger.boundingBox();
          await page.touchscreen.tap(pos.x+pos.width/2,pos.y+pos.height/2);
          await active('awards-news'); assert.ok(Math.abs(await page.evaluate(()=>scrollY)-at)<2);
          if (output) await page.screenshot({path:join(output,'mobile-menu.jpg'),quality:87});
          await page.keyboard.press('Escape');
        }
      } else {
        const r = await cv.boundingBox(), n = await nav.locator('.desktop-nav').boundingBox();
        assert.ok(n.x+n.width<=r.x,'PDF separated from nav');
        await nav.locator('.desktop-nav').getByRole('link',{name:'Awards & News'}).click(); await active('awards-news');
      }
      await page.locator('.to-top').click(); await active('about-me');
      if (width===320) {
        await page.evaluate(()=>document.documentElement.style.fontSize='200%');
        assert.ok(await page.locator('.cover-actions').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      }
      await page.close(); console.log('PASS header, download, deep links, current section and focus at '+width);
    }
    const page = await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:800}});
    await page.goto(url); await page.locator('.cover-papers').click();
    assert.equal(new URL(page.url()).hash,'#publications'); assert.ok(await page.locator('.nav-cv').isVisible());
    await page.locator('.mobile-nav summary').click(); await page.locator('.mobile-nav a[href="#research"]').click();
    assert.equal(new URL(page.url()).hash,'#research'); console.log('PASS no-script navigation');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
