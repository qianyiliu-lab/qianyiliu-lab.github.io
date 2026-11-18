// Run against the built Jekyll site. The map is local and these checks do not open GPT.
const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4000/';
const output = process.argv[3];
(async()=>{
  if(output) await mkdir(output,{recursive:true});
  const browser=await chromium.launch({channel:process.env.QA_BROWSER||'msedge'});
  try {
    for(const [width,height] of [[1440,900],[390,844],[320,640],[740,360]]){
      const p=await browser.newPage({viewport:{width,height},hasTouch:width<800});
      const errors=[];let maps=0;
      p.on('pageerror',e=>errors.push(e.message));
      p.on('request',r=>{if(r.url().includes('barry-arm-relief.webp')) maps++});
      await p.goto(base);
      const terrain=p.getByRole('button',{name:'Terrain',exact:true}), photo=p.getByRole('button',{name:'Photo',exact:true});
      const map=p.locator('.relief-image');
      await terrain.waitFor();assert.equal(maps,0,'map not downloaded on first paint');
      await terrain.click();await map.waitFor();
      assert.equal(await terrain.getAttribute('aria-pressed'),'true');
      assert.ok(await p.locator('[data-credit="terrain"]').isVisible());
      assert.ok(!await p.locator('[data-credit="photo"]').isVisible());
      assert.ok(await map.evaluate(el=>el.complete&&el.naturalWidth===1920&&el.naturalHeight===1080));
      const parent=await p.locator('.estuary').boundingBox();
      if(width>=800){
        await p.mouse.move(parent.x+parent.width*.83,parent.y+parent.height*.37);
        await p.locator('.survey-lens:not([hidden])').waitFor({timeout:4000});
        assert.ok((await p.locator('.survey-lens__surface').evaluate(el=>el.style.backgroundImage)).includes('barry-arm-relief'));
        assert.match(await p.locator('[data-coordinate]').innerText(),/^Point\s+61\./);
      }
      assert.ok(await p.locator('.view-row').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      const bar=await p.locator('.scale-bar').boundingBox(), img=await map.boundingBox();
      assert.ok(Math.abs(bar.width-100*Math.max(img.width/1920,img.height/1080))<1);
      if(output) await p.screenshot({path:join(output,width+'-terrain.jpg'),quality:83});
      await photo.click();await map.waitFor({state:'hidden'});
      assert.equal(await photo.getAttribute('aria-pressed'),'true');
      assert.ok(await p.locator('[data-credit="photo"]').isVisible());
      if(output) await p.screenshot({path:join(output,width+'-photo.jpg'),quality:83});
      assert.deepEqual(errors,[]);await p.close();console.log('PASS landscape',width,height);
    }
    const p=await browser.newPage();await p.route('**/barry-arm-relief.webp',r=>r.abort());
    await p.goto(base);await p.getByRole('button',{name:'Terrain',exact:true}).click();
    await p.locator('[data-view-status]').filter({hasText:'Terrain unavailable'}).waitFor({state:'attached'});
    assert.ok(await p.locator('.estuary picture').isVisible());await p.close();
    const staticPage=await browser.newPage({javaScriptEnabled:false});await staticPage.goto(base);
    assert.ok(!await staticPage.locator('.view-switch').isVisible());assert.ok(await staticPage.locator('[data-credit="photo"]').isVisible());
    console.log('PASS image-failure and static fallback');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
