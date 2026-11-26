const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
});

test('Sasha gift opens cleanly on mobile with 25 interactive wishes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sasha/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('h1')).toHaveText('Саша');
  await expect(page.locator('#wishesGrid .wish')).toHaveCount(25);
  await expect(page.locator('#wishCount')).toHaveText('Открыто 0 из 25');

  await page.locator('#wishesGrid .wish').nth(0).click();
  await expect(page.locator('#wishCount')).toHaveText('Открыто 1 из 25');
  await expect(page.locator('#wishFill')).toHaveCSS('width', /[1-9]/);

  await page.locator('#wishesGrid .wish').nth(24).click();
  await expect(page.locator('#wishCount')).toHaveText('Открыто 2 из 25');
  await expect(page.locator('#wishNote')).toContainText('будь счастлива');

  await page.locator('#giftTrigger').click();
  await expect(page.locator('#certDetails')).toBeVisible();
  await expect(page.locator('#certDetails')).toContainText('5 000 ₽');
  await expect(page.locator('#giftTrigger')).toBeDisabled();

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(errors).toEqual([]);
});

test('Sasha page keeps the premium layout readable on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/sasha/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.craft-panel')).toBeVisible();
  await expect(page.locator('.certificate')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
