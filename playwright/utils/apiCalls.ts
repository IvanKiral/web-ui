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

import {APIRequestContext} from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const userEmail = process.env.USER_EMAIL ?? '';
const userPassword = process.env.USER_PASSWORD ?? '';

const tableAttributes = [
  {
    name: 'Title',
  },
  {
    name: 'Description',
  },
  {
    name: 'Created',
    constraint: {
      type: 'DateTime',
      config: {
        format: 'YYYY-MM-DD',
        asUtc: true,
        minValue: null,
        maxValue: null,
      },
    },
  },
  {
    name: 'Information',
  },
  {
    name: 'Status',
    constraint: {
      type: 'Select',
      config: {
        options: [
          {
            value: 'Done',
            displayValue: '',
          },
          {
            value: 'In progress',
            displayValue: '',
          },
          {
            value: 'In backlog',
            displayValue: '',
          },
        ],
      },
    },
  },
  {
    name: 'Points',
    constraint: {
      type: 'Number',
      config: {
        decimals: null,
        separated: null,
        compact: null,
        forceSign: null,
        negative: null,
        currency: null,
      },
    },
  },
];

const tableData = [
  {
    a1: 'Prepare environment',
    a2: 'Prepare Playwright config file',
    a3: '2023-07-01',
    a4: 'Discuss with contributors',
    a5: 'Done',
    a6: '11',
  },
  {
    a1: 'Analyze UI tests scenarios',
    a2: 'Find the the most usefull paths inside the application',
    a3: '2023-07-15',
    a4: 'Use some kind of source to analyze tests scenarios',
    a5: 'In progress',
    a6: '7',
  },
  {
    a1: 'Write UI tests',
    a2: "Write the first set of Playwright's tests",
    a3: '2023-07-31',
    a4: 'Try to keep the good code practices',
    a5: 'In progress',
    a6: '15',
  },
  {
    a1: 'Set up CI/CD',
    a2: 'Analyze and set up CI/CD using Github Action',
    a3: '2023-08-01',
    a4: 'The knowledge of Bash and YAML might come usefull',
    a5: 'In progress',
    a6: '15',
  },
  {
    a1: 'Give a report',
    a2: 'Give a report to the manager about the completion of the UI tests',
    a3: '2023-08-31',
    a5: 'In backlog',
    a6: '3',
  },
];

export const prepareTableViaApi = async (request: APIRequestContext, tableName: string) => {
  const loginParsedBody = await loginApiCall(request);
  const authToken = loginParsedBody['access_token'];

  const userParsedBody = await getUserApiCall(request, authToken);
  const defaultWorkspace = userParsedBody.defaultWorkspace;

  const collectionParsedBody = await createCollectionApiCall(
    request,
    authToken,
    defaultWorkspace.organizationId,
    defaultWorkspace.projectId,
    tableName
  );
  const collectionId = collectionParsedBody.id;

  await addCollectionAttributesApiCall(
    request,
    authToken,
    defaultWorkspace.organizationId,
    defaultWorkspace.projectId,
    collectionId,
    tableAttributes
  );

  for (const data of tableData) {
    await addDocumentApiCall(
      request,
      defaultWorkspace.organizationId,
      defaultWorkspace.projectId,
      collectionId,
      authToken,
      data
    );
  }
};

const loginApiCall = async (request: APIRequestContext) => {
  const loginFormData = new URLSearchParams();
  loginFormData.append('userName', userEmail);
  loginFormData.append('password', userPassword);

  const loginReponse = await request.post('http://localhost:8080/lumeer-engine/rest/users/login', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: loginFormData.toString(),
  });

  return JSON.parse(await loginReponse.text());
};

const getUserApiCall = async (request: APIRequestContext, authToken: string) => {
  const userResponse = await request.get('http://localhost:8080/lumeer-engine/rest/users/current', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return JSON.parse(await userResponse.text());
};

const createCollectionApiCall = async (
  request: APIRequestContext,
  authToken: string,
  organizationId: string,
  projectId: string,
  collectionName: string
) => {
  const collectionResponse = await request.post(
    `http://localhost:8080/lumeer-engine/rest/organizations/${organizationId}/projects/${projectId}/collections`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {name: collectionName},
    }
  );

  return JSON.parse(await collectionResponse.text());
};

const addCollectionAttributesApiCall = async (
  request: APIRequestContext,
  authToken: string,
  organizationId: string,
  projectId: string,
  collectionId: string,
  tableAttributes: object
) => {
  const collectionResponse = await request.post(
    `http://localhost:8080/lumeer-engine/rest/organizations/${organizationId}/projects/${projectId}/collections/${collectionId}/attributes`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: tableAttributes,
    }
  );

  return JSON.parse(await collectionResponse.text());
};

const addDocumentApiCall = async (
  request: APIRequestContext,
  organizationId: string,
  projectId: string,
  collectionId: string,
  authToken: string,
  data: object
) =>
  request.post(
    `http://localhost:8080/lumeer-engine/rest/organizations/${organizationId}/projects/${projectId}/collections/${collectionId}/documents`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {organizationId, data},
    }
  );
