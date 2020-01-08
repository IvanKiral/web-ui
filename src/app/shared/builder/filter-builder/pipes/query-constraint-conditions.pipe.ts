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

import {Pipe, PipeTransform} from '@angular/core';
import {Attribute} from '../../../../core/store/collections/collection';
import {UnknownConstraint} from '../../../../core/model/constraint/unknown.constraint';
import {TranslationService} from '../../../../core/service/translation.service';
import {ConstraintType} from '../../../../core/model/data/constraint';
import {
  DateTimeConstraintConditionValue,
  UserConstraintConditionValue,
} from '../../../../core/model/data/constraint-condition';
import {ConstraintConditionValueItem} from '../model/query-condition-item';

@Pipe({
  name: 'queryConstraintConditions',
})
export class QueryConstraintConditionsPipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  public transform(attribute: Attribute): ConstraintConditionValueItem[] {
    const constraint = attribute.constraint || new UnknownConstraint();
    let values = [];
    switch (constraint.type) {
      case ConstraintType.User:
        values = Object.values(UserConstraintConditionValue);
        break;
      case ConstraintType.DateTime:
        values = Object.values(DateTimeConstraintConditionValue);
        break;
    }

    return values.map(value => ({
      value,
      title: this.translationService.translateConstraintConditionValue(value, constraint),
    }));
  }
}
