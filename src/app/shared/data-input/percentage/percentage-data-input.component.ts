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
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {keyboardEventCode, KeyCode} from '../../key-code';
import {checkDataInputElementValue, isElementActive, setCursorAtDataInputEnd} from '../../utils/html-modifier';
import {constraintTypeClass} from '../pipes/constraint-class.pipe';
import {CommonDataInputConfiguration} from '../data-input-configuration';
import {DataInputSaveAction, keyboardEventInputSaveAction} from '../data-input-save-action';
import {ConstraintType, PercentageDataValue, PercentageDisplayStyle} from '@lumeer/data-filters';
import {POPUP_DELAY} from '../../../core/constants';

@Component({
  selector: 'percentage-data-input',
  templateUrl: './percentage-data-input.component.html',
  styleUrls: ['./percentage-data-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PercentageDataInputComponent implements OnChanges, AfterViewChecked {
  @Input()
  public focus: boolean;

  @Input()
  public readonly: boolean;

  @Input()
  public value: PercentageDataValue;

  @Input()
  public commonConfiguration: CommonDataInputConfiguration;

  @Input()
  public fontColor: string;

  @Output()
  public valueChange = new EventEmitter<PercentageDataValue>();

  @Output()
  public save = new EventEmitter<{action: DataInputSaveAction; dataValue: PercentageDataValue}>();

  @Output()
  public cancel = new EventEmitter();

  @Output()
  public enterInvalid = new EventEmitter();

  @ViewChild('percentageInput')
  public percentageInput: ElementRef<HTMLInputElement>;

  @HostBinding('class.progress-content')
  public isProgressStyle: boolean;

  public readonly inputClass = constraintTypeClass(ConstraintType.Percentage);

  public valid = true;
  public numericValue: number;

  public readonly popupDelay = POPUP_DELAY;

  private preventSave: boolean;
  private keyDownListener: (event: KeyboardEvent) => void;
  private setFocus: boolean;

  constructor(private element: ElementRef) {}

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.readonly && !this.readonly && this.focus) {
      this.setFocus = true;
      this.preventSave = false;
    }
    if (changes.readonly && this.readonly) {
      this.preventSaveAndBlur();
    }
    if (changes.value || changes.readonly) {
      this.isProgressStyle = this.value?.config?.style === PercentageDisplayStyle.ProgressBar && this.readonly;
    }
    if (changes.value) {
      this.valid = !this.value || this.value.isValid();
      this.numericValue = this.value?.number?.toNumber() || 0;
      if (this.readonly && this.isProgressStyle) {
        checkDataInputElementValue(this.percentageInput?.nativeElement, this.value);
      }
    }
  }

  public ngAfterViewChecked() {
    if (this.setFocus) {
      this.setFocusToInput();
      this.setFocus = false;
    }
  }

  public setFocusToInput() {
    if (this.percentageInput) {
      setCursorAtDataInputEnd(this.percentageInput.nativeElement, this.value);
    }
  }

  private addKeyDownListener() {
    this.removeKeyDownListener();

    this.keyDownListener = event => this.onKeyDown(event);
    this.element.nativeElement.addEventListener('keydown', this.keyDownListener);
  }

  private removeKeyDownListener() {
    if (this.keyDownListener) {
      this.element.nativeElement.removeEventListener('keydown', this.keyDownListener);
    }
    this.keyDownListener = null;
  }

  private onKeyDown(event: KeyboardEvent) {
    switch (keyboardEventCode(event)) {
      case KeyCode.Enter:
      case KeyCode.NumpadEnter:
      case KeyCode.Tab:
        const input = this.percentageInput;
        const dataValue = this.value.parseInput(input.nativeElement.value);

        event.preventDefault();

        if (!this.commonConfiguration?.skipValidation && input && !dataValue.isValid()) {
          event.stopImmediatePropagation();
          this.enterInvalid.emit();
          return;
        }

        this.preventSaveAndBlur();
        this.saveDataValue(dataValue, event);
        return;
      case KeyCode.Escape:
        this.preventSaveAndBlur();
        this.cancel.emit();
        return;
    }
  }

  private saveDataValue(dataValue: PercentageDataValue, event: KeyboardEvent) {
    const action = keyboardEventInputSaveAction(event);
    if (this.commonConfiguration?.delaySaveAction) {
      // needs to be executed after parent event handlers
      setTimeout(() => this.save.emit({action, dataValue}));
    } else {
      this.save.emit({action, dataValue});
    }
  }

  private preventSaveAndBlur() {
    if (isElementActive(this.percentageInput?.nativeElement)) {
      this.preventSave = true;
      this.percentageInput.nativeElement.blur();
      this.removeKeyDownListener();
    }
  }

  public onInput(event: Event) {
    const element = event.target as HTMLInputElement;
    const dataValue = this.value.parseInput(element.value);
    this.valid = dataValue.isValid();

    this.valueChange.emit(dataValue);
  }

  public onBlur() {
    this.removeKeyDownListener();

    if (this.preventSave) {
      this.preventSave = false;
    } else {
      const dataValue = this.value.parseInput(this.percentageInput.nativeElement.value);
      if (this.commonConfiguration?.skipValidation || dataValue.isValid()) {
        this.save.emit({action: DataInputSaveAction.Blur, dataValue});
      } else {
        this.cancel.emit();
      }
    }
  }

  public onFocus() {
    this.addKeyDownListener();
  }
}
