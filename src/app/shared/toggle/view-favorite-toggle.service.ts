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
import {Injectable} from '@angular/core';

import {Store} from '@ngrx/store';

import {UpdateValueService} from '../../core/service/update-value.service';
import {AppState} from '../../core/store/app.state';
import {View} from '../../core/store/views/view';
import {ViewsAction} from '../../core/store/views/views.action';

@Injectable()
export class ViewFavoriteToggleService extends UpdateValueService<boolean, View> {
  constructor(private store$: Store<AppState>) {
    super();
  }

  public shouldUnsubscribePendingUpdate(previousValue: boolean, currentValue: boolean): boolean {
    return previousValue !== currentValue;
  }

  public processUpdate(id: string, value: boolean, data?: View) {
    if (value) {
      this.store$.dispatch(new ViewsAction.AddFavorite({viewId: id, workspace: this.workspace}));
    } else {
      this.store$.dispatch(new ViewsAction.RemoveFavorite({viewId: id, workspace: this.workspace}));
    }
  }

  public processUpdateToStore(id: string, value: boolean, data?: View) {
    if (value) {
      this.store$.dispatch(new ViewsAction.AddFavoriteSuccess({viewId: id}));
    } else {
      this.store$.dispatch(new ViewsAction.RemoveFavoriteSuccess({viewId: id}));
    }
  }
}
