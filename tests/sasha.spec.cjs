const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('Sasha greeting is a short four-scene experience with no wish-card grid', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sasha/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('h1')).toHaveText('Саша');
  await expect(page.locator('.scene')).toHaveCount(4);
  await expect(page.locator('[data-star]')).toHaveCount(5);
  await expect(page.locator('#wishesGrid')).toHaveCount(0);
  await expect(page.locator('#giftTrigger')).toBeVisible();
  const cssAudit = await page.evaluate(() => ({
    ruleCount: document.styleSheets[0].cssRules.length,
    ctaBackground: getComputedStyle(document.querySelector('#begin')).backgroundImage,
    sealBackground: getComputedStyle(document.querySelector('#seal')).backgroundImage,
    starSize: (() => { const r = document.querySelector('[data-star]').getBoundingClientRect(); return [r.width, r.height]; })(),
    sealSize: (() => { const r = document.querySelector('#seal').getBoundingClientRect(); return [r.width, r.height]; })(),
    navSize: (() => { const r = document.querySelector('.side-nav button').getBoundingClientRect(); return [r.width, r.height]; })(),
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  expect(cssAudit.ruleCount).toBeGreaterThan(50);
  expect(cssAudit.ctaBackground).toContain('gradient');
  expect(cssAudit.sealBackground).toContain('gradient');
  expect(cssAudit.starSize[0]).toBeGreaterThanOrEqual(44);
  expect(cssAudit.starSize[1]).toBeGreaterThanOrEqual(44);
  expect(cssAudit.sealSize[0]).toBeGreaterThanOrEqual(44);
  expect(cssAudit.sealSize[1]).toBeGreaterThanOrEqual(44);
  expect(cssAudit.navSize[0]).toBeGreaterThanOrEqual(44);
  expect(cssAudit.navSize[1]).toBeGreaterThanOrEqual(44);
  expect(cssAudit.horizontalOverflow).toBeLessThanOrEqual(1);

  await page.locator('#scrollCue').click();
  await expect(page.locator('#scene1')).toBeInViewport();
  await page.locator('#begin').click();
  await expect(page.locator('#scene1')).toBeInViewport();

  await page.locator('#seal').click();
  await expect(page.locator('#sealNote')).toHaveClass(/show/);

  const messages = [
    'Пусть каждый новый день приносит хотя бы одну хорошую новость.',
    'Пусть рядом будут люди, с которыми легко и спокойно.',
    'Пусть мечты находят дорогу в реальность.',
    'Пусть в жизни будет больше свободы выбирать своё.',
    'Пусть счастье чаще прячется в самых обычных днях.'
  ];
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-star="' + i + '"]').click();
    if (i < 4) await expect(page.locator('#starMessage')).toHaveText(messages[i]);
  }
  await expect(page.locator('#starHint')).toContainText('5 / 5');
  await expect(page.locator('#starMessage')).toContainText('Пусть всё хорошее');
  await page.locator('[data-star="0"]').click();
  await expect(page.locator('#starMessage')).toHaveText(messages[0]);
  await expect(page.locator('#starHint')).toContainText('5 / 5');

  await page.locator('#giftTrigger').click();
  await expect(page.locator('#giftReveal')).toBeVisible();
  await expect(page.locator('#giftTrigger')).toBeEnabled();
  await page.locator('#giftTrigger').click();
  await expect(page.locator('#giftReveal')).toBeHidden();
  await page.locator('#giftTrigger').click();
  await expect(page.locator('#giftReveal')).toBeVisible();
  await expect(page.locator('.gift-value')).toHaveText('5 000 ₽');
  expect(errors).toEqual([]);

  for (let i = 0; i < 4; i++) {
    await page.locator('.side-nav button').nth(i).click();
    await expect(page.locator('.side-nav button').nth(i)).toHaveAttribute('aria-current', 'true');
  }
});


test('every story detail has its own unique physical click target', async ({ page }) => {
  await page.goto('/sasha/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; scroll-snap-type: none !important; } .scene { scroll-snap-align: none !important; }' });
  await page.locator('#seal').click();
  await page.locator('#giftTrigger').click();

  const count = await page.locator('[data-explore]').count();
  expect(count).toBeGreaterThanOrEqual(30);
  const seen = new Set();

  for (let i = 0; i < count; i++) {
    const target = page.locator('[data-explore]').nth(i);
    await target.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }));
    await target.evaluate(el => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const expected = await target.getAttribute('data-explore-message');
    expect(expected).toBeTruthy();
    expect(seen.has(expected)).toBe(false);
    seen.add(expected);

    const point = await target.evaluate(el => {
      const r = el.getBoundingClientRect();
      const fractions = [0.5, 0.28, 0.72, 0.12, 0.88, 0.07, 0.93, 0.03, 0.97];
      for (const fy of fractions) {
        for (const fx of fractions) {
          const x = r.left + r.width * fx;
          const y = r.top + r.height * fy;
          const hit = document.elementFromPoint(x, y);
          if (hit && hit.closest('[data-explore]') === el) return { x, y };
        }
      }
      return null;
    });

    expect(point, 'target ' + i + ' must have an unobstructed physical hit area').not.toBeNull();
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('#detailToast')).toHaveText(expected);
  }

  await page.locator('#scene0 h1').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detailToast')).toContainText('Это поздравление адресовано одной Саше');
});

test('premium scene layout fits narrow phones without horizontal overflow', async ({ page }) => {
  await page.goto('/sasha/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#cosmos')).toBeAttached();
  await expect(page.locator('.gift-card')).toBeVisible();
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal overflow at ' + width + 'px').toBeLessThanOrEqual(1);
    const nav = await page.locator('.side-nav button').first().boundingBox();
    expect(nav.width, 'navigation hit area at ' + width + 'px').toBeGreaterThanOrEqual(44);
    expect(nav.height, 'navigation hit area at ' + width + 'px').toBeGreaterThanOrEqual(44);
  }
});
