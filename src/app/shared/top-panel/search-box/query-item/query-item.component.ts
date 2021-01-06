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

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {QueryItem} from './model/query-item';
import {AbstractControl, FormArray, FormGroup} from '@angular/forms';
import {ConstraintData, ConstraintType} from '../../../../core/model/data/constraint';
import {QueryItemType} from './model/query-item-type';
import {FilterBuilderComponent} from '../../../builder/filter-builder/filter-builder.component';
import {conditionNumInputs} from '../../../../core/store/navigation/query/query.util';
import {SelectConstraintConfig, UserConstraintConfig} from '../../../../core/model/data/constraint-config';
import {SelectConstraint} from '../../../../core/model/constraint/select.constraint';
import {UserConstraint} from '../../../../core/model/constraint/user.constraint';
import {AttributeQueryItem} from './model/attribute.query-item';
import {LinkAttributeQueryItem} from './model/link-attribute.query-item';
import {Attribute} from '../../../../core/store/collections/collection';
import {ConditionType, ConditionValue} from '../../../../core/model/attribute-filter';
import {modifyAttributeForQueryFilter} from '../../../utils/attribute.utils';

@Component({
  selector: 'query-item',
  templateUrl: './query-item.component.html',
  styleUrls: ['./query-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryItemComponent implements OnInit, OnChanges {
  @Input()
  public queryItem: QueryItem;

  @Input()
  public queryItemForm: FormGroup;

  @Input()
  public readonly: boolean;

  @Input()
  public constraintData: ConstraintData;

  @Output()
  public remove = new EventEmitter();

  @Output()
  public change = new EventEmitter();

  @Output()
  public focusInput = new EventEmitter();

  @HostBinding('class.cursor-pointer')
  public cursorPointer: boolean;

  @ViewChild(FilterBuilderComponent)
  public filterBuilderComponent: FilterBuilderComponent;

  public readonly constraintType = ConstraintType;

  public attribute: Attribute;

  constructor(public hostElement: ElementRef) {}

  public get conditionControl(): AbstractControl {
    return this.queryItemForm?.controls?.condition;
  }

  public get conditionValuesControl(): FormArray {
    return this.queryItemForm?.controls?.conditionValues as FormArray;
  }

  public ngOnChanges(changes: SimpleChanges) {
    this.cursorPointer = this.isAttributeType();
    this.attribute = this.createAndModifyConstraint();
  }

  private createAndModifyConstraint(): Attribute {
    return modifyAttributeForQueryFilter(
      (<AttributeQueryItem>this.queryItem)?.attribute || (<LinkAttributeQueryItem>this.queryItem)?.attribute
    );
  }

  public ngOnInit() {
    if (this.isAttributeType() && this.queryItem.fromSuggestion) {
      setTimeout(() => this.filterBuilderComponent?.open());
    }
  }

  private isAttributeType(): boolean {
    const type = this.queryItem && this.queryItem.type;
    return [QueryItemType.Attribute, QueryItemType.LinkAttribute].includes(type);
  }

  @HostListener('click')
  public onClick() {
    if (!this.filterBuilderComponent || !this.isAttributeType()) {
      return;
    }
    this.filterBuilderComponent.toggle();
  }

  public onRemove() {
    this.remove.emit();
  }

  public isFormValid(): boolean {
    if (this.readonly || !this.queryItemForm) {
      return true;
    }
    return this.queryItemForm.valid;
  }

  public onQueryItemChanged() {
    if (this.isFormValid()) {
      this.change.emit();
    }
  }

  public onConditionChange(data: {condition: ConditionType; values: ConditionValue[]}) {
    if (!this.queryItemForm) {
      return;
    }
    const numInputs = conditionNumInputs(data.condition);
    this.queryItem.condition = data.condition;
    this.queryItem.conditionValues = (data.values || []).slice(0, numInputs);
    this.queryItemForm.patchValue({
      condition: data.condition,
      conditionValues: data.values,
    });

    this.onQueryItemChanged();
  }

  public onFinishBuilderEditing() {
    this.focusInput.emit();
  }
}
