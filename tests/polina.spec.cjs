const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

async function openApp(page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => window.__polinaMainReady)).toBe(true);
}

test('all 31 chapters remain reachable in order without runtime errors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await openApp(page);
  await expect(page.locator('.scene')).toHaveCount(31);

  for (let i = 0; i <= 30; i++) {
    const active = page.locator('.scene.active');
    await expect(active).toHaveAttribute('data-scene', String(i));
    if (i === 30) break;
    if (i === 0) {
      await active.locator('[data-go="1"]').click();
    } else {
      await active.locator('button').filter({ hasText: /Продолжить историю|Открыть подарок/ }).last().click();
    }
    await expect(page.locator('.scene.active')).toHaveAttribute('data-scene', String(i + 1));
  }
  expect(pageErrors).toEqual([]);
});

test('final chapter scrolls and the gift opens by click and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/#chapter-31');
  const finalScene = page.locator('.scene[data-scene="30"]');
  await expect(finalScene).toHaveClass(/active/);

  const scroll = await finalScene.evaluate(el => ({
    overflowY: getComputedStyle(el).overflowY,
    maxScroll: el.scrollHeight - el.clientHeight
  }));
  expect(scroll.overflowY).toBe('auto');
  expect(scroll.maxScroll).toBeGreaterThan(0);
  await finalScene.evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await finalScene.evaluate(el => el.scrollTop)).toBeGreaterThan(0);

  await finalScene.evaluate(el => { el.style.scrollBehavior = 'auto'; el.scrollTop = 0; });
  const gift = page.locator('#giftBox');
  await expect(gift).toBeVisible();
  await gift.evaluate(el => { el.style.animation = 'none'; el.style.transform = 'none'; });
  await page.waitForTimeout(900);
  await gift.scrollIntoViewIfNeeded();
  const rect = await gift.boundingBox();
  const layout = await page.evaluate(() => {
    const scene = document.querySelector('.scene[data-scene="30"]');
    const content = scene.querySelector('.content');
    const gift = document.querySelector('#giftBox');
    const viewport = document.querySelector('#viewport');
    const box = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, top:r.top, bottom:r.bottom }; };
    return { scene:box(scene), content:box(content), gift:box(gift), viewport:box(viewport), scroll:{ scene:scene.scrollTop, viewport:viewport.scrollTop, document:document.scrollingElement.scrollTop }, sceneHeight:{client:scene.clientHeight,scroll:scene.scrollHeight} };
  });
  expect(rect).not.toBeNull();
  expect(rect.y + rect.height / 2).toBeGreaterThan(0);
  expect(rect.y + rect.height / 2).toBeLessThan(page.viewportSize().height);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(gift).toHaveClass(/open/);
  await expect(page.locator('#toast')).toContainText(/самое главное/);
  await gift.focus();
  await gift.press('Enter');
  await expect(page.locator('#toast')).toBeVisible();
});

test('journal puzzle accepts the intended sequence', async ({ page }) => {
  await openApp(page, '/#chapter-15');
  for (const symbol of ['☾', '✦', '♧', '🐾']) {
    await page.locator('[data-journal]').filter({ hasText: symbol }).click();
  }
  await expect(page.locator('#journalResult')).toContainText(/открыт/i);
});

test('radio puzzle reaches the intended frequencies', async ({ page }) => {
  await openApp(page, '/#chapter-16');
  for (let i = 0; i < 2; i++) await page.locator('[data-tune="0"][data-dir="1"]').click();
  for (let i = 0; i < 5; i++) await page.locator('[data-tune="1"][data-dir="-1"]').click();
  for (let i = 0; i < 6; i++) await page.locator('[data-tune="2"][data-dir="1"]').click();
  await expect(page.locator('#tune0')).toHaveText('05');
  await expect(page.locator('#tune1')).toHaveText('02');
  await expect(page.locator('#tune2')).toHaveText('08');
  await page.locator('#radioCheck').click();
  await expect(page.locator('#radioResult')).toContainText(/Связь установлена/);
});

test('last constellation and finale interaction work', async ({ page }) => {
  await openApp(page, '/#chapter-30');
  for (const star of [0, 2, 1, 4, 3, 5]) {
    await page.locator('[data-star="' + star + '"]').click();
  }
  await expect(page.locator('#finalConstellationNote')).toContainText(/собрано/i);
  await page.locator('#finalTom').click();
  await expect(page.locator('#finalTomNote')).toContainText(/С днём рождения/);
});
