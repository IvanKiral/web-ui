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
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatMenuModule} from '@angular/material/menu';

import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {ColorPickerModule} from 'ngx-color-picker';

import {DataInputModule} from '../data-input/data-input.module';
import {DirectivesModule} from '../directives/directives.module';
import {DropdownModule} from '../dropdown/dropdown.module';
import {InputModule} from '../input/input.module';
import {LinksModule} from '../links/links.module';
import {AttributeFunctionModalModule} from '../modal/attribute/function/attribute-function-modal.module';
import {AttributeTypeModalModule} from '../modal/attribute/type/attribute-type-modal.module';
import {PipesModule} from '../pipes/pipes.module';
import {PresenterModule} from '../presenter/presenter.module';
import {ResourceActivityModule} from '../resource/activity/resource-activity.module';
import {ResourceCommentsModule} from '../resource/comments/resource-comments.module';
import {AttributesSettingsModule} from '../settings/attributes/attributes-settings.module';
import {DataResourceDetailComponent} from './detail/data-resource-detail.component';
import {DataResourceDataComponent} from './detail/data/data-resource-data.component';
import {DataResourceDataRowComponent} from './detail/data/row/data-resource-data-row.component';
import {DataResourceDataRowIconsComponent} from './detail/data/row/icons/data-resource-data-row-icons.component';
import {DetailTabsComponent} from './detail/detail-tabs/detail-tabs.component';
import {DataResourceDetailHeaderComponent} from './detail/header/data-resource-detail-header.component';
import {DetailSettingsButtonComponent} from './detail/header/settings-button/detail-settings-button.component';
import {DetailSettingsDropdownComponent} from './detail/header/settings-button/dropdown/detail-settings-dropdown.component';
import {LinksToolbarComponent} from './detail/links-toolbar/links-toolbar.component';
import {ResourcePermissionsPipe} from './detail/pipes/resource-permissions.pipe';

@NgModule({
  imports: [
    CommonModule,
    DataInputModule,
    InputModule,
    PipesModule,
    DirectivesModule,
    ColorPickerModule,
    InputModule,
    AttributeTypeModalModule,
    AttributeFunctionModalModule,
    PresenterModule,
    LinksModule,
    ResourceCommentsModule,
    TooltipModule,
    MatMenuModule,
    DropdownModule,
    AttributesSettingsModule,
    ResourceActivityModule,
  ],
  declarations: [
    DataResourceDetailComponent,
    DataResourceDetailHeaderComponent,
    DataResourceDataComponent,
    DataResourceDataRowComponent,
    DataResourceDataRowIconsComponent,
    DetailTabsComponent,
    LinksToolbarComponent,
    DetailSettingsButtonComponent,
    DetailSettingsDropdownComponent,
    ResourcePermissionsPipe,
  ],
  exports: [DataResourceDetailComponent],
})
export class DataResourceModule {}
