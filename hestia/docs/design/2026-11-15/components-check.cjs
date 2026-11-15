const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('/Users/david.meguira/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
 try {
 const page = await browser.newPage({ viewport: { width: 360, height: 844 }, isMobile: true, hasTouch: true });
 const errors = [], checks = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => { localStorage.setItem('hestia-language', 'fr'); localStorage.setItem('hestia-crew-id', '1'); });
 await page.goto('http://127.0.0.1:8011/crew/#/checkin');
 const mood = page.getByRole('button', { name: '4 Bon', exact: true });
 await mood.click(); assert.equal(await mood.getAttribute('aria-pressed'), 'true');
 await mood.click(); assert.equal(await mood.getAttribute('aria-pressed'), 'false');
 await mood.click();
 const symptom = page.getByRole('button', { name: 'Fatigue', exact: true });
 await symptom.focus(); await page.keyboard.press('Space');
 assert.equal(await symptom.getAttribute('aria-pressed'), 'true');
 assert(await symptom.evaluate(e => getComputedStyle(e).outlineStyle !== 'none'));
 assert(await page.locator('.hz-choice').evaluateAll(es => es.every(e => e.getBoundingClientRect().height >= 44)));
 await page.screenshot({ path: '/private/tmp/hestia-interaction-review/components-checkin.png' });
 await page.getByRole('button', { name: 'Passer aux mesures', exact: true }).click();
 await page.locator('#field-heart_rate').fill('65'); await page.locator('#field-exercise_min').fill('0');
 await page.getByRole('button', { name: 'Vérifier mon bilan', exact: true }).click();
 assert((await page.locator('main').innerText()).includes('65 bpm'));
 // Hold a save then fail it: no server data is written.
 let saves = 0; let release;
 await page.route('**/api/crew/1/checkin', async route => {
  saves++; await new Promise(resolve => { release = resolve; });
  await route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"Test: station unavailable"}' });
 });
 const save = page.getByRole('button', { name: /Enregistrer le bilan/ });
 await save.click(); const busy = page.locator('button[aria-busy="true"]'); await busy.waitFor();
 await busy.evaluate(e => { e.click(); e.click(); });
 assert.equal(saves, 1); assert.equal(await busy.getAttribute('aria-disabled'), 'true');
 release(); await page.getByRole('alert').waitFor();
 await page.getByRole('button', { name: /Modifier mon ressenti|Modifier le ressenti/ }).click();
 assert.equal(await mood.getAttribute('aria-pressed'), 'true');
 assert.equal(await symptom.getAttribute('aria-pressed'), 'true');
 checks.push('360 px: mood select/deselect, keyboard symptom toggle/focus, 44 px targets, answers preserved after review and failed save; busy button accepts only one request');
 for (const width of [360, 390]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('http://127.0.0.1:8011/crew/#/history');
  await page.getByRole('button', { name: 'Glycémie', exact: true }).click();
  assert.equal(await page.locator('.hz-indicator-picker .hz-btn').count(), 9);
  assert(await page.locator('.hz-indicator-picker .hz-btn').evaluateAll(es => es.every(e => e.getBoundingClientRect().height >= 44)));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
 }
 await page.screenshot({ path: '/private/tmp/hestia-interaction-review/components-history.png' });
 await page.goto('http://127.0.0.1:8011/crew/#/settings');
 const input=page.getByRole('textbox', { name: 'Adresse de la station' });
 assert((await input.evaluate(e => getComputedStyle(e).fontFamily)).includes('Mono'));
 assert(await page.locator('.hz-btn').evaluateAll(es => es.every(e => e.getBoundingClientRect().height >= 44)));
 await page.screenshot({ path: '/private/tmp/hestia-interaction-review/components-settings.png' });
 await page.emulateMedia({ reducedMotion: 'reduce' });
 assert.equal(await page.locator('.hz-btn').first().evaluate(e => getComputedStyle(e).transitionDuration), '0s');
 checks.push('360/390 px: history shares 9 buttons, touch targets hold, no overflow; settings keeps mono address; reduced motion removes transitions');
 const station=await browser.newPage({ viewport: { width: 1280, height: 800 } });
 station.on('pageerror', e => errors.push(e.message));
 await station.goto('http://127.0.0.1:1422/#/crew/1');
 await station.locator('.hz-panel').first().waitFor();
 assert(await station.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
 await station.screenshot({ path: '/private/tmp/hestia-interaction-review/components-station.png' });
 checks.push('1280 px: shared panels render in station profile without horizontal overflow');
 assert.deepEqual(errors, []);
 fs.writeFileSync('/private/tmp/hestia-interaction-review/components-checks.json', JSON.stringify({checks, errors}, null, 2));
 console.log(JSON.stringify({checks, errors}));
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
