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

import {test, expect, FullConfig, chromium} from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const userEmail = process.env.USER_EMAIL ?? '';
const userPassword = process.env.USER_PASSWORD ?? '';

test('get auth token', async ({page, request}) => {
  const formData = new URLSearchParams();
  formData.append('userName', userEmail);
  formData.append('password', userPassword);

  const x = await request.post('http://localhost:8080/lumeer-engine/rest/users/login', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: formData.toString(),
  });

  const parsed_body = JSON.parse(await x.text());
  process.env.TEST_AUTH_TOKEN = parsed_body['access_token'];
});
