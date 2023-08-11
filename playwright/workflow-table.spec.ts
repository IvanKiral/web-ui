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

let tableUrl = '';
const tableName = 'testTable';

test('create table', async ({page}) => {
  await page.goto('/ui');
  await page.click('a:text("tables")');

  await page.click('button:has-text("Create New Table")');
  const newCardInput = page.locator('div[placeholder="Click to set name"]').first();

  await newCardInput.dblclick();
  await newCardInput.fill(tableName);
  await newCardInput.press('Enter');

  const newCard = page.getByRole('link').filter({has: page.locator(`div:text("${tableName}")`)});

  await expect(newCard).toBeVisible();

  tableUrl = await newCard.getAttribute('href');
});

test('Worklflow table add collumns and rows with data', async ({page}) => {
  // await page.goto(tableUrl.replace('table', 'workflow'));
  await page.goto(
    '/ui/w/TSTLM/SCRUM/view/workflow?q=eyJzIjpbeyJpIjoiMTY5MTM0NTY4NjcwMDEwYWRhZWYxNzIxNGEiLCJjIjoiNjRjZmUzMTY0YTdkNDQxMDE1YjI1OTZlIn1dfQeef07380'
  );
  const tableCellsInput: Record<string, string[]> = {
    firstRow: ['David', '30'],
    secondRow: ['Adela', '27'],
    thirdRow: ['Mark', '28'],
  };

  const addCollumnHeader = page.locator('thead').locator('input[placeholder="Add Column"]');
  const addCollumnHeaderDiv = page.locator('th').filter({has: page.locator('input[placeholder="Add Column"]')});

  await expect(addCollumnHeader).toBeVisible();

  await addCollumnHeaderDiv.dblclick();
  const inputLocator = page
    .locator('th[class="cdk-drag sticky-header table-cell text-nowrap ng-star-inserted editing"]')
    .locator('input');

  await inputLocator.fill('Name');
  await inputLocator.press('Enter');
  //wait for new collumn to apply.
  await page.waitForTimeout(1000);

  await expect(page.locator('thead').locator('input[placeholder="Add Column"]')).toBeVisible();

  await addCollumnHeaderDiv.dblclick();
  await inputLocator.fill('Age');
  await inputLocator.press('Enter');
  await page.waitForTimeout(1000);
  await expect(page.locator('thead').locator('input[placeholder="Add Column"]')).toBeVisible();

  await page.click('button:has-text("Add new row")');
  await page.waitForTimeout(200);

  let rows = await page.locator('tbody').locator('tr').all();

  const firstRow = await rows.at(0).locator('td').all();

  const addInputToTableCell = async (locator: Locator, text: string) => {
    await locator.dblclick();
    await locator.locator('input').fill(text);
    await locator.press('Enter');

    await page.waitForTimeout(1000);
  };

  await addInputToTableCell(firstRow.at(1), tableCellsInput.firstRow[1]);
  await addInputToTableCell(firstRow.at(0), tableCellsInput.firstRow[0]);

  await page.click('button:has-text("Add new row")');
  await page.waitForTimeout(1000);

  rows = await page.locator('tbody').locator('tr').all();
  const secondRow = await rows.at(1).locator('td').all();

  await addInputToTableCell(secondRow.at(0), tableCellsInput.secondRow[0]);
  await addInputToTableCell(secondRow.at(1), tableCellsInput.secondRow[1]);

  await page.click('button:has-text("Add new row")');
  await page.waitForTimeout(1000);
  rows = await page.locator('tbody').locator('tr').all();
  const thirdRow = await rows.at(2).locator('td').all();

  await addInputToTableCell(thirdRow.at(0), tableCellsInput.thirdRow[0]);
  await addInputToTableCell(thirdRow.at(1), tableCellsInput.thirdRow[1]);

  // +1 is the row with 'Add new row' button
  await expect(page.locator('tbody').locator('tr')).toHaveCount(3 + 1);

  const finalRows = await page.locator('tbody').locator('tr').all();
  // +1 in the row is for static menu
  await expect(finalRows.at(0).locator('td')).toHaveCount(3);
  await expect(finalRows.at(1).locator('td')).toHaveCount(3);
  await expect(finalRows.at(2).locator('td')).toHaveCount(3);

  const assertTableRow = async (row: Locator[], cells: string[]) => {
    await expect(row.at(0).locator(`div:text("${cells[0]}")`)).toBeVisible();
    await expect(row.at(1).locator(`div:text("${cells[1]}")`)).toBeVisible();
  };

  await assertTableRow(await finalRows.at(0).locator('td').all(), tableCellsInput.firstRow);
  await assertTableRow(await finalRows.at(1).locator('td').all(), tableCellsInput.secondRow);
  await assertTableRow(await finalRows.at(2).locator('td').all(), tableCellsInput.thirdRow);
});

test('Add collumns with attribute type', async ({page}) => {
  await page.goto(
    '/ui/w/TSTLM/SCRUM/view/workflow?q=eyJzIjpbeyJpIjoiMTY5MTM0NTY4NjcwMDEwYWRhZWYxNzIxNGEiLCJjIjoiNjRjZmUzMTY0YTdkNDQxMDE1YjI1OTZlIn1dfQeef07380'
  );

  const headerName = 'Due to';
  const addCollumnHeaderDiv = page.locator('th').filter({has: page.locator('input[placeholder="Add Column"]')});
  const inputLocator = page
    .locator('th[class="cdk-drag sticky-header table-cell text-nowrap ng-star-inserted editing"]')
    .locator('input');
  await addCollumnHeaderDiv.dblclick();
  await inputLocator.fill(headerName);
  await inputLocator.press('Enter');
  await page.waitForTimeout(1000);

  const headerCell = (await page.locator('thead').locator('th').all()).at(2);
  await expect(headerCell).toBeVisible();

  await headerCell.click({button: 'right'});
  await page.locator('div[role="menu"]').locator('button:has-text("Attribute settings...")').click();
  await page.locator('button:has-text("None")').click();
  await page.locator('a:has-text("Date")').click();
  await page.locator('button:has-text("Save")').click();

  const addInputToTableCell = async (locator: Locator, text: string) => {
    await locator.dblclick();
    await locator.locator('input').fill(text);
    await locator.press('Enter');

    await page.waitForTimeout(1000);
  };

  const rows = await page.locator('tbody').locator('tr').all();
  await (await rows.at(0).locator('td').all()).at(2).dblclick();

  const dates = ['11.08.2023', '04.08.2023', '11.09.2023'];
  const firstRow = await rows.at(0).locator('td').all();
  const secondRow = await rows.at(1).locator('td').all();
  const thirdRow = await rows.at(2).locator('td').all();

  await addInputToTableCell(firstRow.at(2), dates[0]);
  await addInputToTableCell(secondRow.at(2), dates[1]);
  await addInputToTableCell(thirdRow.at(2), dates[2]);

  await expect(firstRow.at(2).locator(`div:has-text("${dates[0]}")`)).toBeVisible();
  await expect(secondRow.at(2).locator(`div:has-text("${dates[1]}")`)).toBeVisible();
  await expect(thirdRow.at(2).locator(`div:has-text("${dates[2]}")`)).toBeVisible();
});

test('group by', async ({page}) => {
  await page.goto(
    '/ui/w/TSTLM/SCRUM/view/workflow?q=eyJzIjpbeyJpIjoiMTY5MTM0NTY4NjcwMDEwYWRhZWYxNzIxNGEiLCJjIjoiNjRjZmUzMTY0YTdkNDQxMDE1YjI1OTZlIn1dfQeef07380'
  );

  await page.locator('button:has-text("Group By")').click();
  await page.locator('button:has-text("Due to")').hover();
  await page.locator('button:has-text("Months and years")').click();

  await expect(page.locator('table')).toHaveCount(2);

  await expect(page.locator('span:has-text("08.2023")')).toBeVisible();
  await expect(page.locator('span:has-text("09.2023")')).toBeVisible();

  const tables = await page.locator('table').all();

  //+1 is for 'Add new row'
  await expect(tables.at(0).locator('tbody').locator('tr')).toHaveCount(2 + 1);

  //+1 is for 'Add new row'
  await expect(tables.at(1).locator('tbody').locator('tr')).toHaveCount(1 + 1);
});

test('delete rows columns and then whole table', async ({page}) => {
  await page.goto(
    '/ui/w/TSTLM/SCRUM/view/workflow?q=eyJzIjpbeyJpIjoiMTY5MTM0NTY4NjcwMDEwYWRhZWYxNzIxNGEiLCJjIjoiNjRjZmUzMTY0YTdkNDQxMDE1YjI1OTZlIn1dfQeef07380'
  );

  await page.waitForSelector('thead');

  const ths = await page.locator('th').all();

  const deleteColumn = async (th: Locator) => {
    await th.click({button: 'right'});
    await page.locator('button:has-text("Delete Column")').click();
    await page.locator('button:has-text("Yes")').click();
    await page.waitForTimeout(500);
  };

  await deleteColumn(ths.at(2));
  await deleteColumn(ths.at(1));
  await deleteColumn(ths.at(0));

  const rows = await page.locator('tbody').locator('tr').all();
  const deleteRow = async (tr: Locator) => {
    await tr.click({button: 'right'});
    await page.locator('button:has-text("Remove row")').click();
    await page.locator('button:has-text("Yes")').click();
    await page.waitForTimeout(500);
  };

  await deleteRow(rows.at(2));
  await deleteRow(rows.at(1));
  await deleteRow(rows.at(0));

  await expect(page.locator('th').filter({has: page.locator('input[placeholder="Add Column"]')})).toBeVisible();
  await expect(page.locator('button:has-text("Add new row")')).toBeVisible();

  await page.waitForTimeout(500);
});
