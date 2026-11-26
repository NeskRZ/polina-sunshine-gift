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

  await page.locator('#begin').click();
  await expect(page).toHaveURL(/#?$/);
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

  await page.locator('#giftTrigger').click();
  await expect(page.locator('#giftReveal')).toBeVisible();
  await expect(page.locator('#giftTrigger')).toBeDisabled();
  await expect(page.locator('.gift-value')).toHaveText('5 000 ₽');
  expect(errors).toEqual([]);
});

test('premium scene layout fits narrow phones without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/sasha/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#cosmos')).toBeAttached();
  await expect(page.locator('.gift-card')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
