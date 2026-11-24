// Run against a built site with Playwright installed. All Worker traffic is mocked.
const assert = require('node:assert/strict');
const {mkdir} = require('node:fs/promises');
const {join} = require('node:path');
const {chromium} = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:4000/';
const screenshots = process.argv[3];
const sizes = [[1440,900,true],[390,844,true],[320,640,false],[740,360,true],[1024,768,false]];

(async () => {
  if (screenshots) await mkdir(screenshots,{recursive:true});
  const browser = await chromium.launch({channel:process.env.QA_BROWSER || 'msedge'});
  try {
    for (const [width,height,online] of sizes) {
      const p = await browser.newPage({viewport:{width,height},hasTouch:width<800,reducedMotion:'reduce'});
      // A non-loopback test origin exercises production mode, but serves the local build.
      const host = width===1024 ? new URL(base).origin : 'https://qa-home.test';
      if (host==='https://qa-home.test') await p.route(host+'/**',async r=>{
        const u = new URL(r.request().url());
        await r.fulfill({response:await p.request.get(new URL(u.pathname+u.search,base).href)});
      });
      const errors = [];
      let posts=0, checks=0, fail=false, lastPost, gate;
      p.on('pageerror', e=>errors.push(e.message));
      await p.route('https://api.openai.com/**',r=>{errors.push('Direct model request');return r.abort()});
      await p.route('https://*.workers.dev/**',async r=>{
        const headers={'access-control-allow-origin':host,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'};
        if(r.request().method()==='OPTIONS') return r.fulfill({status:204,headers});
        if(new URL(r.request().url()).pathname==='/status'){
          checks++;if(gate)await gate;return r.fulfill({headers,json:{available:online}});
        }
        assert.equal(new URL(r.request().url()).pathname,'/ask');
        assert.equal(r.request().method(),'POST');posts++;
        lastPost = r.request().postDataJSON();
        return r.fulfill({headers,status:fail?503:200,json:fail?{}:{answer:'Landslides and floods. <not-html>',sources:['research','invalid','__proto__']}});
      });
      await p.goto(host+'/');
      const trigger=p.locator('button.ask-launch');
      const box=p.getByRole('dialog',{name:'Research Q&A'}), summary=p.locator('.qa-suggestions summary');
      const form=p.locator('.qa-form'), input=p.getByLabel('Ask a research question',{exact:true});
      const capture=async name=>{if(screenshots)await p.screenshot({path:join(screenshots,width+'-'+name+'.jpg'),quality:82})};
      await trigger.waitFor();
      assert.equal(checks,0);
      const rect=await trigger.boundingBox();
      assert.ok(rect.x>=0 && rect.x+rect.width<=width && rect.y+rect.height<=height,'hero action fits first screen');
      await capture('entry');
      await trigger.click();
      await box.waitFor();
      if(online) {
        await p.locator('.qa-source:visible').waitFor();
        assert.equal(await p.locator('.qa-source').inputValue(),'ai');
        assert.equal(await input.evaluate(el=>el===el.ownerDocument.activeElement),width>=800,'desktop typing / mobile keyboard');
        assert.ok(await form.evaluate(el=>el.nextElementSibling.classList.contains('qa-body')),'composer precedes topic list at launch');
      }
      else {
        assert.ok(await input.isEditable());assert.ok(await form.isVisible());
        await input.fill('如何联系 Qianyi？');
        await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});
        assert.equal(await box.locator('.qa-turn').count(),0,'IME confirmation is not submission');
        assert.ok(await input.inputValue());await input.press('Enter');
        await box.locator('.qa-turn').getByText('qianyi.liu@stonybrook.edu',{exact:true}).waitFor();
        assert.equal(posts,0);
        if(width===1024)assert.equal(checks,0,'preview does not contact the Worker');
        await summary.click();
      }
      const bounds=await box.boundingBox();
      assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=width+1 && bounds.y+bounds.height<=height+1);
      assert.ok(await box.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'dialog has no horizontal overflow');
      await capture('open');
      await box.getByRole('button',{name:'Which paper should I read first?'}).click();
      await box.getByRole('link',{name:'Read the paper'}).waitFor();
      assert.equal(await box.getByRole('link',{name:'Read the paper'}).getAttribute('href'),'https://doi.org/10.1016/j.gsf.2026.102355');
      assert.equal(posts,0);
      assert.equal(await p.locator('.qa-suggestions').getAttribute('open'),null);
      if(online) assert.ok(await form.evaluate(el=>el.previousElementSibling.classList.contains('qa-body')),'composer follows answers in conversation');
      await summary.click();await box.getByRole('button',{name:'Which projects are ongoing?'}).click();
      if(online){
        await input.fill('What hazards does Qianyi study?');await input.press('Enter');
        await box.getByText('Landslides and floods. <not-html>',{exact:true}).waitFor();
        assert.equal(posts,1);assert.equal(await box.locator('a[href="#invalid"], a[href="#__proto__"], not-html').count(),0);
        await capture('answer');
        await box.getByRole('link',{name:'Research directions',exact:true}).click();
        assert.ok(!await box.isVisible());assert.equal(new URL(p.url()).hash,'#research');
        await trigger.click();await p.locator('.qa-source:visible').waitFor();fail=true;
        await input.fill('Another question');await box.getByRole('button',{name:'Send question'}).click();
        await box.getByText(/No AI answer is available/).waitFor();
        assert.ok(await form.isVisible());assert.ok(await input.isEditable());
        await input.fill('SARIMA');await input.press('Enter');
        await box.locator('.qa-turn').getByRole('link',{name:/prediction method of fire frequency/}).waitFor();
        assert.equal(posts,2);
      }
      await p.keyboard.press('Escape');assert.ok(!await box.isVisible());
      assert.ok(await trigger.evaluate(el=>el===el.ownerDocument.activeElement),'focus returns to opener');
      await trigger.click();assert.equal(await box.locator('.qa-turn').count(),0);
      await box.getByRole('button',{name:'Close research Q&A'}).click();
      const actions=p.locator('.paper-ask'), n=await actions.count();
      assert.equal(n,await p.locator('.paper h4 a[href^="https://doi.org/"]').count());
      const beforePaper=posts;
      for(let i=0;i<n;i++){
        const trigger=actions.nth(i), item=trigger.locator('xpath=ancestor::article[1]');
        const paperTitle=await item.locator('h4').innerText(), doi=await item.locator('h4 a').getAttribute('href');
        await trigger.click();
        const panel=p.getByRole('dialog',{name:'Paper Q&A'});
        await panel.waitFor();
        assert.equal(await panel.locator('.qa-paper-title').innerText(),paperTitle);
        assert.equal(await panel.locator('.qa-paper-title').getAttribute('href'),doi);
        assert.ok(!await panel.locator('.qa-suggestions').isVisible());
        if(online) await p.locator('.qa-source:visible').waitFor();
        if(i===0) await capture('paper');
        // Review the clipboard payload in memory; do not touch the system clipboard.
        await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async s=>{window.testCitation=s}}}));
        await panel.getByRole('button',{name:'Copy citation'}).click();
        assert.ok((await p.evaluate(()=>window.testCitation)).includes(doi));
        assert.equal(posts,beforePaper+(online&&i>0?1:0),'opening or copying a paper is free');
        if(online&&i===0){
          fail=false;await input.fill('What is the subject?');await input.press('Enter');
          await panel.getByText('Landslides and floods. <not-html>',{exact:true}).waitFor();
          assert.equal(lastPost.question,'What is the subject?');
          assert.ok(lastPost.history[0].content.includes(paperTitle)&&lastPost.history[0].content.includes(doi));
          await p.keyboard.press('Escape');assert.ok(await trigger.evaluate(el=>el===document.activeElement));
        } else {
          if(!online){
            await input.fill('Who wrote this paper?'); await input.press('Enter');
            await panel.locator('.qa-turn').getByText((await item.locator('.authors').innerText()).trim(),{exact:true}).waitFor();
            assert.equal(posts,beforePaper);await panel.locator('.qa-paper summary').click();
          }
          await panel.getByRole('link',{name:'Homepage record'}).click();assert.ok(!await panel.isVisible());
          assert.equal(new URL(p.url()).hash,'#'+await item.getAttribute('id'));
        }
      }
      await trigger.click();assert.ok(!await p.locator('.qa-paper').isVisible());await p.keyboard.press('Escape');
      if(online && width===1440){
        let release;gate=new Promise(resolve=>release=resolve);
        await trigger.click();await input.fill('geohazards');release();
        const choice=p.locator('.qa-source:visible');await choice.waitFor();
        assert.equal(await choice.inputValue(),'local','late status never upgrades an existing draft');
        const prior=posts;await input.press('Enter');assert.equal(posts,prior);
        await choice.selectOption('ai');await input.fill('Use GPT now');await input.press('Enter');
        await box.getByText('Landslides and floods. <not-html>',{exact:true}).waitFor();assert.equal(posts,prior+1);
        await p.keyboard.press('Escape');
        await p.route('**/status',r=>r.abort('failed'));
        await trigger.click();
        await box.getByText(/Live AI is unavailable/).waitFor();
        const offlinePosts=posts;
        await input.click();await p.keyboard.type('landslides');
        assert.equal(await input.inputValue(),'landslides');
        await box.getByRole('button',{name:'Send question'}).click();
        await box.locator('.qa-turn:not(.qa-user) a').first().waitFor();
        assert.equal(posts,offlinePosts,'failed status check does not disable input or send a paid request');
        await p.keyboard.press('Escape');
      }
      assert.deepEqual(errors,[]);
      await p.close();console.log('PASS',width,height,online?'online + budget fallback':'guide only');
    }
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
