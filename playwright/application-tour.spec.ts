/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {test, expect} from '@playwright/test';

test('application-tour test', async ({page}) => {
  await page.goto('/ui');
  await expect(page.locator('input[placeholder="Type anything you search for…"]')).toBeVisible();

  await page.locator('div[tooltip="User menu"]').click();
  await page.locator('button[title="Application Tour"]').click();

  await expect(page.locator('div[id=driver-popover-item]')).toBeVisible();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Welcome to Lumeer');
  await page.locator('button[class=driver-next-btn]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Access your information');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('See the tables');
  await page.locator('button[class=driver-next-btn]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Search for information');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Perspectives');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Views and sharing');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Help with Lumeer');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Invite teammates');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[class=driver-popover-title]')).toHaveText('Return to this Tour');
  await page.locator('button[class="driver-next-btn"]').click();

  await expect(page.locator('div[id=driver-popover-item]')).not.toBeVisible();
});
