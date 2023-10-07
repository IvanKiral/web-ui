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

test('hide and show tab', async ({page}) => {
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');

  await page.locator('search-perspective div[class="content"] i').click();
  await page.locator('dashboard-tab-badge').filter({hasText: 'Tasks'}).getByTitle('Hide tab').click();
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page.locator('search-perspective div[class="content"] li')).toHaveCount(3);

  await page.locator('search-perspective div[class="content"] i').click();
  await page.getByTitle('Show tab').click();
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page.locator('search-perspective div[class="content"] li')).toHaveCount(4);
});

const newTabName = 'New Tab';

test('add new dashboard', async ({page}) => {
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');

  await page.locator('search-perspective div[class="content"] i').click();
  await page.locator('div[tooltip="Add a new tab"] i').click();
  await page.getByLabel('Title').fill(newTabName);
  await page.getByRole('button', {name: '+ Add a Row'}).click();
  await page.locator('.dropdown-item').first().click();
  await page.locator('dashboard-cell-preview div').click();
  await page.getByRole('button', {name: 'Select Item Type'}).click();
  await page.locator('a').filter({hasText: 'Notes'}).click();
  await page.locator('dashboard-cell-title').getByRole('textbox').click();
  await page.locator('dashboard-cell-title').getByRole('textbox').fill('New Title');
  await page.getByRole('button', {name: '+ Add Action'}).click();
  await page.locator('dashboard-action-config').getByRole('button', {name: 'Select View'}).click();
  await page
    .locator('a')
    .filter({hasText: /^My Tasks$/})
    .click();
  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page.locator('search-perspective div[class="content"]')).toContainText(newTabName);

  await page.getByRole('link', {name: newTabName}).click();
  await expect(page.getByText('New Title')).toBeVisible();
});

test('Remove new tab', async ({page}) => {
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');
  await page.locator('search-perspective div[class="content"] i').click();
  await page.getByTitle('Remove tab').click();

  await page.getByRole('button', {name: 'Save'}).click();

  await expect(page.locator('search-perspective div[class="content"]')).not.toContainText(newTabName);
});
