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
import {isNotNullOrUndefined} from '@lumeer/utils';

import {COLOR_SUCCESS} from '../../../../core/constants';
import {BlocklyUtils, MasterBlockType} from '../blockly-utils';
import {BlocklyComponent} from './blockly-component';

declare var Blockly: any;

export class GetParentDocumentBlocklyComponent extends BlocklyComponent {
  private tooltip: string;

  public constructor(public blocklyUtils: BlocklyUtils) {
    super(blocklyUtils);

    this.tooltip = $localize`:@@blockly.tooltip.getParentDocumentBlock:Gets the parent record in hierarchy. Returns null if there isn't any.`;
  }

  public getVisibility(): MasterBlockType[] {
    return [MasterBlockType.Rule, MasterBlockType.Link];
  }

  public registerBlock(workspace: any) {
    const this_ = this;

    Blockly.Blocks[BlocklyUtils.GET_PARENT_DOCUMENT] = {
      init: function () {
        this.jsonInit({
          type: BlocklyUtils.GET_PARENT_DOCUMENT,
          message0: '%{BKY_BLOCK_GET_PARENT_DOCUMENT}', // get parent in hierarchy %1
          args0: [
            {
              type: 'input_value',
              name: 'DOCUMENT',
            },
          ],
          output: '',
          colour: COLOR_SUCCESS,
          tooltip: this_.tooltip,
          helpUrl: '',
        });
      },
    };

    Blockly.JavaScript[BlocklyUtils.GET_PARENT_DOCUMENT] = function (block) {
      const value_document = Blockly.JavaScript.valueToCode(block, 'DOCUMENT', Blockly.JavaScript.ORDER_ATOMIC) || null;

      const code = this_.blocklyUtils.getLumeerVariable() + `.getParentDocument(${value_document})`;

      return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
    };
  }

  public getDocumentVariablesXml(workspace: any): string {
    return '<xml><block type="' + BlocklyUtils.GET_PARENT_DOCUMENT + '"></block></xml>';
  }

  private checkWorkspaceChange(workspace, changeEvent, block) {
    if (isNotNullOrUndefined(block) && block.type === BlocklyUtils.GET_PARENT_DOCUMENT) {
      const input = block.getInput('DOCUMENT');

      // is the input connected?
      if (isNotNullOrUndefined(input.connection.targetConnection?.check_)) {
        const inputType =
          input.connection.targetConnection?.check_ instanceof Array
            ? input.connection.targetConnection?.check_[0]
            : input.connection.targetConnection?.check_;

        // something unsupported got connected
        if (!inputType.endsWith(BlocklyUtils.DOCUMENT_VAR_SUFFIX)) {
          this.blocklyUtils.tryDisconnect(block, input.connection);
        } else {
          block.setOutput(true, inputType);
        }
      } else {
        // we don't know the output type
        block.setOutput(true, 'UNKNOWN');
      }
    }
  }

  public onWorkspaceChange(workspace, changeEvent) {
    if (
      changeEvent instanceof Blockly.Events.Create ||
      changeEvent instanceof Blockly.Events.Change ||
      changeEvent instanceof Blockly.Events.Move
    ) {
      const block = workspace.getBlockById(changeEvent.blockId);
      this.checkWorkspaceChange(workspace, changeEvent, block);

      if (changeEvent.newParentId) {
        const parent = workspace.getBlockById(changeEvent.newParentId);
        this.checkWorkspaceChange(workspace, changeEvent, parent);
      }

      if (changeEvent.oldParentId) {
        const parent = workspace.getBlockById(changeEvent.oldParentId);
        this.checkWorkspaceChange(workspace, changeEvent, parent);
      }
    }
  }
}
