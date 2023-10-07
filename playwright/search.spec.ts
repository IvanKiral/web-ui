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

test.describe.configure({mode: 'serial'});

test('basic full text search test', async ({page}) => {
  const searchedWord = 'Playwright';
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');
  await page.locator('search-input').click();
  await page.locator('search-input input').fill(searchedWord);
  await page.locator('search-box').press('Enter');

  await page.getByRole('link', {name: 'data'}).click();
  await page.waitForLoadState('networkidle');

  // 2 for result, +1 for placeholder row.
  await expect(page.locator('table-body').locator('table-primary-row')).toHaveCount(2 + 1);
  const rows = await page.locator('table-body').locator('table-primary-row').all();
  const wordRegex = new RegExp(`.*${searchedWord}.*`, 'gm');
  await expect(rows[0]).toHaveText(wordRegex);
  await expect(rows[1]).toHaveText(wordRegex);
});

test('full text search test with table specified', async ({page}) => {
  const searchedWord = 'tests';
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');

  await page.locator('search-input').click();
  await page.locator('search-input input').fill('data');
  await page.getByText('data Table').click();

  await page.locator('search-input').click();
  await page.locator('search-input input').fill(searchedWord);
  await page.locator('search-box').press('Enter');

  await page.getByRole('link', {name: 'data'}).click();
  await page.waitForLoadState('networkidle');

  // 2 for result, +1 for placeholder row.
  await expect(page.locator('table-body').locator('table-primary-row')).toHaveCount(3 + 1);
  const rows = await page.locator('table-body').locator('table-primary-row').all();
  const wordRegex = new RegExp(`.*${searchedWord}.*`, 'gm');
  await expect(rows[0]).toHaveText(wordRegex);
  await expect(rows[1]).toHaveText(wordRegex);
  await expect(rows[1]).toHaveText(wordRegex);
});

test('search test with specifying table and Attribute', async ({page}) => {
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');
  await page.locator('search-input').click();
  await page.locator('search-input input').fill('data');

  await page.getByText('data Table').click();

  await page.locator('search-input').click();
  //for some reason needed, without it the test fails
  await page.waitForTimeout(500);

  await page.getByText('Status Attribute').click();

  await expect(page.locator('data-input select-data-input div')).toBeAttached();
  await page.locator('data-input select-data-input div').click();
  await page.locator('a:has-text("In progress")').click();
  await page.locator('search-input').press('Enter');

  await page.getByRole('link', {name: 'data'}).click();
  await page.waitForLoadState('networkidle');

  //+ 1 for placeholder row
  await expect(page.locator('table-primary-row')).toHaveCount(3 + 1);
  await expect(page.locator('table-primary-row div:has-text("In progress")')).toHaveCount(3 + 1);

  await page.getByText('Status Has SomeIn progress').click();
  await page.waitForTimeout(200);

  await expect(page.locator('filter-builder-content')).toBeAttached();
  await page.locator('filter-builder-content data-input select-data-input div').click();
  await page.locator('a:has-text("Done")').click();
  await page.locator('input[placeholder="Search or filter…"]').press('Enter');

  await expect(page.locator('table-primary-row')).toHaveCount(4 + 1);
  await expect(page.locator('table-primary-row div:has-text("In progress")')).toHaveCount(3 + 1);
  await expect(page.locator('table-primary-row div:has-text("Done")')).toHaveCount(1);

  await page.waitForTimeout(200);
});

test('search with date', async ({page}) => {
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');

  await page.locator('search-input').click();
  await page.locator('search-input input').fill('data');
  await page.getByText('data Table').click();

  await page.locator('search-input').click();
  //for some reason needed, without it the test fails
  await page.getByText('Created Attribute').click();
  await page.waitForTimeout(200);
  await page.getByText('Is Between').click();

  await page.locator('filter-builder-content input').first().click();
  await page.locator('filter-builder-content input').first().fill('2023-08-01');

  await page.locator('filter-builder-content input').last().click();
  await page.locator('filter-builder-content input').last().fill('2023-09-01');

  await page.getByRole('link', {name: 'data'}).click();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('table-primary-row')).toHaveCount(2 + 1);
  await page.waitForTimeout(1000);
});

test('search test with multiple coniditions', async ({page}) => {
  await page.goto('http://localhost:7000/ui/w/TSTLM/SCRUM/view/search/all');

  await page.locator('search-input').click();
  await page.locator('search-input input').fill('data');
  await page.getByText('data Table').click();

  await page.locator('search-input').click();
  //for some reason needed, without it the test fails
  await page.waitForTimeout(500);
  await page.getByText('Status Attribute').click();
  await expect(page.locator('data-input select-data-input div')).toBeAttached();
  await page.locator('data-input select-data-input div').click();
  await page.locator('a:has-text("In progress")').click();
  await page.locator('search-input').press('Enter');

  await page.locator('search-input').click();
  await page.getByText('Created Attribute').click();
  await page.waitForTimeout(200);
  await page.getByText('Is Before').click();
  await page.locator('filter-builder-content input').click();
  await page.locator('filter-builder-content input').fill('2023-08-01');

  await page.getByRole('link', {name: 'data'}).click();
  await page.waitForLoadState('networkidle');

  //+ 1 for placeholder row
  await expect(page.locator('table-primary-row')).toHaveCount(2 + 1);
  await expect(page.locator('table-primary-row div:has-text("In progress")')).toHaveCount(2 + 1);

  await expect(page.locator('table-primary-row div:has-text("In progress")')).toHaveCount(2 + 1);

  await page.waitForTimeout(200);
});
