const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('/Users/david.meguira/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const dir = '/private/tmp/hestia-interaction-review';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [], checks = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => { localStorage.setItem('hestia-language', 'fr'); localStorage.setItem('hestia-crew-id', '1'); });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  const crew = 'http://127.0.0.1:8011/crew/';
  const capture = async name => { await page.screenshot({ path: `${dir}/crew-lot-${name}.png`, animations: 'disabled' }); };
  const visibleAnchor = async () => page.evaluate(() => {
    const a = document.querySelector('[data-zone-context]').getBoundingClientRect();
    const m = document.querySelector('main').getBoundingClientRect();
    const d = document.querySelector('dialog').getBoundingClientRect();
    const centre = (a.top + a.bottom) / 2;
    return centre >= m.top && centre <= d.top;
  });
  const settleScroll = () => page.waitForTimeout(700);
  await page.goto(crew + '#/home');
  await page.getByRole('button', { name: /^Cœur:/ }).last().waitFor();
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const nav = page.getByRole('navigation', { name: 'Actions du jour' });
    assert.equal(await nav.getByRole('button').count(), 3);
    for (const name of ['Test de réaction', 'Résultats']) {
      const box = await nav.getByRole('button', { name, exact: true }).boundingBox();
      assert(box.height >= 44); assert(box.y + box.height < 650);
    }
    assert.equal(await page.getByText('Autres activités du jour', { exact: false }).count(), 0);
    assert.equal(await page.getByText('Routine et badges', { exact: false }).count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await capture('home');
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  assert(page.url().endsWith('/settings'));
  await page.getByRole('link', { name: 'HESTIA · Accueil' }).click();
  assert(page.url().endsWith('/home'));
  checks.push('Home: 3 visible actions above silhouette, 44 px targets at 360/390; no duplicate reaction card or routine accordions; settings/home navigation');
  for (const [zone, label] of [['heart', /^Cœur:/], ['brain_morale', /^Cerveau/], ['eyes_sans', /^Yeux/], ['muscles', /^Muscles:/]]) {
    const trigger = page.getByRole('button', { name: label }).last();
    await trigger.scrollIntoViewIfNeeded();
    const previous = await page.locator('main').evaluate(e => e.scrollTop);
    await trigger.click(); await settleScroll();
    assert(await visibleAnchor(), `${zone} visible above sheet`);
    if (zone === 'heart') {
      await capture('heart');
      // All summaries must be keyboard reachable through the modal's focus trap.
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Comprendre ce résultat');
      await page.keyboard.press('Enter'); await settleScroll();
      assert(await visibleAnchor(), 'heart remains visible after sheet expands');
      const table = page.getByRole('table');
      assert.equal(await table.locator('tbody tr').count(), 3);
      assert((await table.innerText()).includes('90–<120'));
      assert.equal(await page.getByText('Toutes les règles de couleur', { exact: true }).locator('..').getAttribute('open'), null);
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'mmHg');
      await page.keyboard.press('Enter');
      await page.getByText('Millimètres de mercure : l’unité utilisée pour la tension artérielle.').first().waitFor();
      await page.keyboard.press('Enter');
      await page.getByRole('table').scrollIntoViewIfNeeded(); await capture('explanation');
      await page.getByText('Toutes les règles de couleur', { exact: true }).click();
      assert((await page.locator('.hz-threshold-guide').first().innerText()).includes('au moins 140'));
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert(Math.abs(await page.locator('main').evaluate(e => e.scrollTop) - previous) <= 1);
    assert(await trigger.evaluate(e => e === document.activeElement));
  }
  checks.push('Heart/brain/eyes/muscles framed above sheet; expansion tracks heart; closing restores scroll/focus; reference table retains exact bounds and full rules; unit help works by keyboard');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('main').evaluate(e => e.scrollTo({ top: 0 }));
  await page.getByRole('button', { name: /^Cœur:/ }).last().click();
  assert(await visibleAnchor()); await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 667, height: 375 });
  const shortTrigger = page.getByRole('button', { name: /^Cœur:/ }).last(); await shortTrigger.scrollIntoViewIfNeeded();
  const shortTop = await page.locator('main').evaluate(e => e.scrollTop);
  await shortTrigger.click(); assert.equal(await page.locator('main').evaluate(e => e.scrollTop), shortTop);
  assert((await page.getByRole('dialog').boundingBox()).height <= 375 * .88 + 1);
  await page.keyboard.press('Escape');
  checks.push('Reduced motion uses immediate framing; short landscape screen retains reading space and does not reframe');
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(crew + '#/history');
  await page.getByRole('button', { name: 'Glycémie', exact: true }).click();
  await page.getByText(/simulé/).last().waitFor();
  assert.equal(await page.locator('.hz-indicator-picker svg').count(), 9);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await capture('history');
  await page.getByRole('button', { name: 'Langue : français. Passer en anglais' }).click();
  await page.getByRole('button', { name: 'Blood pressure', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Language: English. Switch to French' }).click();
  await page.getByRole('button', { name: 'À propos Utiliser HESTIA' }).click();
  await page.getByText('Créé par David Meguira & Massinissa Bencherif.').waitFor();
  await page.keyboard.press('Escape');
  checks.push('History: 9 labelled icons, translated names/origin/dates, no horizontal overflow; EN/FR and credits available');
  // This local server was verified with lsof to use /private/tmp/hestia-interaction-review/demo.db.
  // Use seeded member 4 for meal writes, leaving the displayed Alex profile alone.
  const foodContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await foodContext.addInitScript(() => { localStorage.setItem('hestia-language', 'fr'); localStorage.setItem('hestia-crew-id', '4'); });
  const meal = await foodContext.newPage(); meal.on('pageerror', e => errors.push(e.message));
  const mealURL = 'http://127.0.0.1:8011/api/crew/4/meal';
  const before = await (await foodContext.request.get(mealURL)).json();
  await meal.goto(crew + '#/meal'); await meal.locator('.hz-food-card').first().waitFor();
  await meal.screenshot({ path: `${dir}/crew-lot-meal.png`, animations: 'disabled' });
  let writes = 0; await meal.route('**/api/crew/4/meal', async route => { if (route.request().method() === 'POST') writes++; await route.continue(); });
  await meal.locator('.hz-food-card button').first().evaluate(button => { button.click(); button.click(); });
  await meal.locator('.hz-meal-receipt').waitFor();
  const after = await (await foodContext.request.get(mealURL)).json();
  assert.equal(writes, 1);
  assert.equal(after.kcal_eaten_today - before.kcal_eaten_today, before.available[0].kcal);
  const item = after.available.find(i => i.food_item_id === before.available[0].food_item_id);
  assert.equal(item.available_portions, before.available[0].available_portions - 1);
  await meal.screenshot({ path: `${dir}/crew-lot-meal-saved.png`, animations: 'disabled' });
  await meal.unroute('**/api/crew/4/meal');
  await meal.route('**/api/crew/4/meal', route => route.request().method() === 'POST' ? route.abort('connectionfailed') : route.continue());
  await meal.locator('.hz-food-card button').first().click();
  await meal.getByRole('alert').waitFor(); assert.equal(await meal.locator('.hz-meal-receipt').count(), 0);
  await meal.unroute('**/api/crew/4/meal');
  await meal.route('**/api/crew/4/meal', route => route.abort('connectionfailed'));
  await meal.reload(); await meal.getByRole('alert').waitFor();
  assert.equal(await meal.locator('.hz-loading').count(), 0);
  await meal.unroute('**/api/crew/4/meal'); await meal.getByRole('button', { name: 'Réessayer' }).click(); await meal.locator('.hz-food-card').first().waitFor();
  checks.push('Real meal on disposable DB: 1 POST under double activation, exact kcal increment and stock deduction, visible receipt; failed save has no success receipt; load error/retry recovers');
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  desktop.on('pageerror', e => errors.push(e.message));
  await desktop.goto('http://127.0.0.1:1422/#/settings');
  await desktop.getByRole('link', { name: /HESTIA/ }).click(); assert(desktop.url().endsWith('/crew'));
  checks.push('Station HESTIA brand link returns to the crew overview');
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${dir}/crew-lot-checks.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2)); await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
