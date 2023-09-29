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

import {test, expect, Locator} from '@playwright/test';

test.describe.configure({mode: 'serial'});

const url =
  'http://localhost:7000/ui/w/TSTLM/SCRUM/view/kanban?q=eyJzIjpbeyJpIjoiMTY5NTk5MTMzOTk1OTEwODExYzk2ZTY3NWEiLCJjIjoiNjUxNjZlMjZiNDJhZWYwYTgxODVhODM0In1dfQd30a8ad9';

test('Kanban board set header', async ({page}) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', {name: 'Select attribute'}).click();
  await page.locator('a').filter({hasText: 'Status'}).click();

  await expect(page.locator('kanban-column')).toHaveCount(3);

  const columns = await page.locator('kanban-column').all();

  const checkStatus = async (col: Locator, status: 'Done' | 'In progress' | 'In Backlog') => {
    const posts = await col.locator('post-it').all();

    await Promise.all(
      posts.map(async p => {
        const locator = p.locator('post-it-row').filter({hasText: ' Status'}).locator('span');
        await expect(locator).toHaveText(status);
      })
    );
  };

  await expect(columns[0].locator('kanban-column-header')).toHaveText('Done');
  await expect(columns[0].locator('post-it')).toHaveCount(1);
  await checkStatus(columns[0], 'Done');

  await expect(columns[1].locator('kanban-column-header')).toHaveText('In Backlog');
  await expect(columns[1].locator('post-it')).toHaveCount(1);
  await checkStatus(columns[1], 'In Backlog');

  await expect(columns[2].locator('kanban-column-header')).toHaveText('In progress');
  await expect(columns[2].locator('post-it')).toHaveCount(3);
  await checkStatus(columns[2], 'In progress');
});

test('dragging', async ({page}) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', {name: 'Select attribute'}).click();
  await page.locator('a').filter({hasText: 'Status'}).click();

  // simulating drag and drop
  await page.locator('kanban-column').nth(2).locator('post-it').nth(0).hover();
  await page.mouse.down();
  // needs to be twice to simulate dragover
  await page.locator('kanban-column').nth(1).locator('post-it').nth(0).hover();
  await page.locator('kanban-column').nth(1).locator('post-it').nth(0).hover();
  await page.mouse.up();

  await expect(page.locator('kanban-column').nth(1).locator('post-it')).toHaveCount(2);
  await expect(page.locator('kanban-column').nth(2).locator('post-it')).toHaveCount(2);

  // simulating drag and drop
  await page.locator('kanban-column').nth(1).locator('post-it').nth(0).hover();
  await page.mouse.down();
  // needs to be twice to simulate dragover
  await page.locator('kanban-column').nth(2).locator('post-it').nth(0).hover();
  await page.locator('kanban-column').nth(2).locator('post-it').nth(0).hover();
  await page.mouse.up();

  await expect(page.locator('kanban-column').nth(1).locator('post-it')).toHaveCount(1);
  await expect(page.locator('kanban-column').nth(2).locator('post-it')).toHaveCount(3);

  await page.waitForTimeout(1000);
});

test('tuning the rows', async ({page}) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', {name: 'Select attribute'}).click();
  await page.waitForTimeout(200);
  await page.locator('a').filter({hasText: 'Status'}).click();
  await page.waitForTimeout(200);

  await page.locator('settings-button button').click();
  await page.locator('attribute-settings').filter({hasText: 'Created'}).click();
  await page.locator('attribute-settings').filter({hasText: 'Description'}).click();
  await page.locator('settings-button button').click();

  const postsRowsLocator = (await page.locator('post-it').all()).map(p => p.locator('post-it-row'));

  await Promise.all(
    postsRowsLocator.map(async p => {
      await expect(p).toHaveCount(3);
    })
  );

  await page.locator('settings-button button').click();
  await page.locator('attribute-settings').filter({hasText: 'Created'}).click();
  await page.locator('attribute-settings').filter({hasText: 'Description'}).click();
  await page.locator('settings-button button').click();

  await Promise.all(
    postsRowsLocator.map(async p => {
      await expect(p).toHaveCount(5);
    })
  );

  await page.waitForTimeout(1000);
});

test('drag the whole collumns', async ({page}) => {
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', {name: 'Select attribute'}).click();
  await page.waitForTimeout(200);
  await page.locator('a').filter({hasText: 'Status'}).click();
  await page.waitForTimeout(200);

  await page.locator('kanban-column').nth(1).locator('kanban-column-header').hover();
  await page.mouse.down();
  await page.locator('kanban-column').locator('kanban-column-header').nth(0).hover();
  await page.locator('kanban-column').locator('kanban-column-header').nth(0).hover();
  await page.mouse.up();

  await expect(page.locator('kanban-column-header').nth(0)).toHaveText('In Backlog');
  await expect(page.locator('kanban-column-header').nth(1)).toHaveText('Done');

  await page.locator('kanban-column').nth(0).locator('kanban-column-header').hover();
  await page.mouse.down();
  await page.locator('kanban-column').locator('kanban-column-header').nth(1).hover();
  await page.locator('kanban-column').locator('kanban-column-header').nth(1).hover();
  await page.mouse.up();

  await expect(page.locator('kanban-column-header').nth(0)).toHaveText('Done');
  await expect(page.locator('kanban-column-header').nth(1)).toHaveText('In Backlog');
});
