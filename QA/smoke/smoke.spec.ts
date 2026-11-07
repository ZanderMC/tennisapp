import { test, expect } from '@playwright/test';

test.describe('Smoke Test - Server Health Check', () => {
  
  test('debería responder con HTTP 200 y cargar el contenedor principal @smoke', async ({ page }) => {
   
    const response = await page.goto('/');

    
    if (!response) {
      throw new Error('El servidor no respondió a la petición (Server Down).');
    }

    expect(response.status()).toBe(200);

    const rootContainer = page.locator('#root').or(page.locator('body'));
    await expect(rootContainer).toBeVisible({ timeout: 5000 });
  });

});