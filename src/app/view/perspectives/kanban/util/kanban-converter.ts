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
import * as moment from 'moment';

import {
  Constraint,
  ConstraintData,
  ConstraintType,
  DataAggregationType,
  DataAggregator,
  DataAggregatorAttribute,
  DateTimeConstraintConfig,
  DocumentsAndLinksData,
  SelectConstraint,
  UnknownConstraint,
  aggregateDataValues,
  findAttributeByQueryAttribute,
  findConstraintByQueryAttribute,
  findResourceByQueryResource,
  queryAttributePermissions,
} from '@lumeer/data-filters';
import {convertToBig, deepObjectsEquals, isNotNullOrUndefined} from '@lumeer/utils';

import {ResourcesPermissions} from '../../../../core/model/allowed-permissions';
import {AttributesResource, AttributesResourceType, DataResource} from '../../../../core/model/resource';
import {Attribute, Collection} from '../../../../core/store/collections/collection';
import {findAttributeConstraint} from '../../../../core/store/collections/collection.util';
import {
  KanbanAggregation,
  KanbanAttribute,
  KanbanColumn,
  KanbanConfig,
  KanbanResource,
  KanbanStemConfig,
  KanbanValueType,
} from '../../../../core/store/kanbans/kanban';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {ViewSettings} from '../../../../core/store/view-settings/view-settings';
import {createDateTimeOptions} from '../../../../shared/date-time/date-time-options';
import {SelectItemWithConstraintFormatter} from '../../../../shared/select/select-constraint-item/select-item-with-constraint-formatter.service';
import {SizeType} from '../../../../shared/slider/size/size-type';
import {sortDataResourcesObjectsByViewSettings} from '../../../../shared/utils/data-resource.utils';
import {parseDateTimeByConstraint} from '../../../../shared/utils/date.utils';
import {generateId} from '../../../../shared/utils/resource.utils';
import {KanbanCard, KanbanCreateResource, KanbanData, KanbanDataColumn} from './kanban-data';
import {cleanKanbanAttribute, isKanbanAggregationDefined} from './kanban.util';

interface AggregatedColumnData {
  count: number;
  values: any[];
  constraint?: Constraint;
}

const COLUMN_WIDTH = 300;

export class KanbanConverter {
  private dataAggregator: DataAggregator;
  private collections: Collection[];
  private data: DocumentsAndLinksData;
  private linkTypes: LinkType[];
  private settings: ViewSettings;
  private constraintData: ConstraintData;

  constructor(private constraintItemsFormatter: SelectItemWithConstraintFormatter) {
    this.dataAggregator = new DataAggregator((value, constraint, data, aggregatorAttribute) =>
      this.formatKanbanValue(value, constraint, data, aggregatorAttribute)
    );
  }

  public convert(
    config: KanbanConfig,
    collections: Collection[],
    linkTypes: LinkType[],
    data: DocumentsAndLinksData,
    permissions: ResourcesPermissions,
    settings: ViewSettings,
    constraintData?: ConstraintData
  ): {config: KanbanConfig; data: KanbanData} {
    this.updateData(collections, linkTypes, data, settings, constraintData);
    const {columnsMap, otherColumn} = this.groupDataByColumns(config, permissions);

    const kanbanData = createKanbanData(
      config,
      columnsMap,
      otherColumn,
      collections,
      linkTypes,
      settings,
      constraintData
    );
    this.fillCreateResources(config, kanbanData, permissions);
    return {data: kanbanData, config: pickKanbanConfigFromData(config, kanbanData)};
  }

  private updateData(
    collections: Collection[],
    linkTypes: LinkType[],
    data: DocumentsAndLinksData,
    settings: ViewSettings,
    constraintData?: ConstraintData
  ) {
    this.collections = collections;
    this.linkTypes = linkTypes;
    this.data = data;
    this.settings = settings;
    this.constraintData = constraintData;
  }

  private groupDataByColumns(
    config: KanbanConfig,
    permissions: ResourcesPermissions
  ): {
    columnsMap: Record<string, Partial<KanbanDataColumn>>;
    otherColumn: Partial<KanbanDataColumn>;
  } {
    const stemsConfigs = config?.stemsConfigs || [];
    const columnsMap: Record<string, Partial<KanbanDataColumn>> = createInitialColumnsMap(
      config,
      this.collections,
      this.linkTypes
    );
    const otherColumn: Partial<KanbanDataColumn> = {cards: [], createdFromAttributes: [], createResources: []};
    const columnsAggregated: Record<string, AggregatedColumnData> = {};
    const otherAggregated: AggregatedColumnData = {count: 0, values: []};

    for (let stemIndex = 0; stemIndex < stemsConfigs.length; stemIndex++) {
      const stemConfig = stemsConfigs[stemIndex];
      const attribute = findAttributeByQueryAttribute(stemConfig.attribute, this.collections, this.linkTypes);
      if (!attribute) {
        continue;
      }

      const constraint = this.checkOverrideConstraint(attribute, stemConfig.attribute);
      const aggregationConstraint =
        stemConfig.aggregation &&
        findConstraintByQueryAttribute(stemConfig.aggregation, this.collections, this.linkTypes);

      const stemData = this.data?.dataByStems?.[stemIndex];

      this.dataAggregator.updateData(
        this.collections,
        stemData?.documents || [],
        this.linkTypes,
        stemData?.linkInstances || [],
        stemConfig.stem,
        this.constraintData
      );
      const rowAttribute: DataAggregatorAttribute = {
        resourceIndex: stemConfig.attribute.resourceIndex,
        attributeId: attribute.id,
        data: stemConfig.attribute.constraint,
        unique: true,
      };

      const valueAttribute: DataAggregatorAttribute = stemConfig.resource
        ? {
            resourceIndex: stemConfig.resource.resourceIndex,
            attributeId: null,
            unique: true,
          }
        : {...rowAttribute};

      const resource = createKanbanCardResource(
        stemConfig.resource || stemConfig.attribute,
        this.collections,
        this.linkTypes
      );
      const resourcePermissions = queryAttributePermissions(stemConfig.resource || stemConfig.attribute, permissions);
      const resourceType = stemConfig.resource?.resourceType || stemConfig.attribute.resourceType;

      const aggregatedData = this.dataAggregator.aggregateArray([rowAttribute, valueAttribute], []);

      for (const aggregatedDataItem of aggregatedData.items) {
        const firstChain = aggregatedDataItem.dataResourcesChains[0] || [];
        const title = aggregatedDataItem.value;
        const showDueHours = (stemConfig?.doneColumnTitles || []).indexOf(title) < 0;

        for (const childItem of aggregatedDataItem.children || []) {
          const dataResources = childItem.dataResources || [];
          const dataResourcesChain = stemConfig.resource
            ? [...firstChain, ...(childItem.dataResourcesChains[0] || [])]
            : firstChain;

          if (isNotNullOrUndefined(title) && String(title).trim() !== '') {
            const createdByAttribute = cleanKanbanAttribute(stemConfig.attribute);
            const stringValue = title.toString();

            let columnData: Partial<KanbanDataColumn> = columnsMap[stringValue];
            if (!columnData) {
              columnData = {
                cards: [],
                createdFromAttributes: [],
                createResources: [],
                constraint,
              };
              columnsMap[stringValue] = columnData;
            }

            columnData.constraint = columnData.constraint || constraint;
            if (!kanbanAttributesIncludesAttribute(columnData.createdFromAttributes, createdByAttribute)) {
              columnData.createdFromAttributes.push(createdByAttribute);
            }

            columnData.cards.push(
              ...dataResources
                .filter(dataResource => !this.dataResourceIsAlreadyInColumn(dataResource, resourceType, columnData))
                .map(dataResource => ({
                  dueHours: showDueHours ? getDueHours(dataResource, resource, stemConfig) : null,
                  dataResource,
                  resource,
                  resourceType,
                  stemIndex,
                  permissions: resourcePermissions,
                  dataResourcesChain,
                }))
            );
            if (stemConfig.aggregation) {
              if (!columnsAggregated[stringValue]) {
                columnsAggregated[stringValue] = {count: 0, values: [], constraint: null};
              }
              this.fillAggregatedMap(columnsAggregated[stringValue], dataResources, stemConfig);
              columnsAggregated[stringValue].constraint =
                columnsAggregated[stringValue].constraint || aggregationConstraint;
            }
          } else {
            otherColumn.constraint = otherColumn.constraint || constraint;

            otherColumn.cards.push(
              ...dataResources
                .filter(dataResource => !this.dataResourceIsAlreadyInColumn(dataResource, resourceType, otherColumn))
                .map(dataResource => ({
                  dueHours: showDueHours ? getDueHours(dataResource, resource, stemConfig) : null,
                  dataResource,
                  resource,
                  resourceType,
                  stemIndex,
                  permissions: resourcePermissions,
                  dataResourcesChain,
                }))
            );
            if (stemConfig.aggregation) {
              this.fillAggregatedMap(otherAggregated, dataResources, stemConfig);
              otherAggregated.constraint = otherAggregated.constraint || aggregationConstraint;
            }
          }
        }
      }
    }
    if (isKanbanAggregationDefined(config)) {
      this.fillSummaries(config, columnsMap, otherColumn, columnsAggregated, otherAggregated);
    }
    return {columnsMap, otherColumn};
  }

  private dataResourceIsAlreadyInColumn(
    dataResource: DataResource,
    resourceType: AttributesResourceType,
    column: Partial<KanbanDataColumn>
  ): boolean {
    return column.cards.some(card => card.dataResource.id === dataResource.id && resourceType === card.resourceType);
  }

  private checkOverrideConstraint(attribute: Attribute, kanbanAttribute: KanbanAttribute): Constraint {
    const kanbanConstraint = kanbanAttribute?.constraint;
    const overrideConstraint =
      kanbanConstraint &&
      this.constraintItemsFormatter.checkValidConstraintOverride(attribute?.constraint, kanbanConstraint);
    return overrideConstraint || attribute?.constraint || new UnknownConstraint();
  }

  private fillSummaries(
    config: KanbanConfig,
    columnsMap: Record<string, Partial<KanbanDataColumn>>,
    otherColumn: Partial<KanbanDataColumn>,
    columnsAggregated: Record<string, AggregatedColumnData>,
    otherAggregated: AggregatedColumnData
  ) {
    if (config.aggregation?.valueType === KanbanValueType.AllPercentage) {
      const aggregationConstraint = findAggregationConstraint(config, this.collections, this.linkTypes);
      computeRelativeValue(config, columnsMap, otherColumn, columnsAggregated, otherAggregated, aggregationConstraint);
    } else {
      Object.keys(columnsAggregated).forEach(title => {
        const constraint = columnsAggregated[title].constraint || new UnknownConstraint();
        columnsMap[title].summary = formatAggregatedValue(
          columnsAggregated[title],
          config.aggregation,
          constraint,
          this.constraintData
        );
      });

      const otherConstraint = otherAggregated.constraint || new UnknownConstraint();
      otherColumn.summary = formatAggregatedValue(
        otherAggregated,
        config.aggregation,
        otherConstraint,
        this.constraintData
      );
    }
  }

  private fillAggregatedMap(
    aggregated: AggregatedColumnData,
    dataResources: DataResource[],
    stemConfig: KanbanStemConfig
  ) {
    if (stemConfig?.aggregation) {
      dataResources.forEach(dataResource => {
        const value = dataResource?.data?.[stemConfig.aggregation.attributeId];
        if (isNotNullOrUndefined(value)) {
          aggregated.count++;
          aggregated.values.push(value);
        }
      });
    }
  }

  private formatKanbanValue(
    value: any,
    constraint: Constraint,
    constraintData: ConstraintData,
    aggregatorAttribute: DataAggregatorAttribute
  ): any {
    const kanbanConstraint = aggregatorAttribute.data && (aggregatorAttribute.data as Constraint);
    const overrideConstraint =
      kanbanConstraint && this.constraintItemsFormatter.checkValidConstraintOverride(constraint, kanbanConstraint);
    const finalConstraint = overrideConstraint || constraint || new UnknownConstraint();
    return finalConstraint.createDataValue(value, constraintData).serialize();
  }

  private fillCreateResources(config: KanbanConfig, data: KanbanData, permissions: ResourcesPermissions) {
    const createResources = this.getAllCreateResources(config, permissions);
    data.columns.forEach(column => this.fillCreateResourcesColumn(column, createResources));
    this.fillCreateResourcesColumn(data.otherColumn, createResources);
  }

  private fillCreateResourcesColumn(column: KanbanDataColumn, createResources: KanbanCreateResource[]) {
    column.createResources = createResources.filter(createResource =>
      this.columnCanCreateResource(column, createResource)
    );
  }

  private columnCanCreateResource(column: KanbanDataColumn, createResource: KanbanCreateResource): boolean {
    if (column.createdFromAttributes.some(attribute => deepObjectsEquals(attribute, createResource.kanbanAttribute))) {
      return true;
    }
    if (createResource.kanbanAttribute.resourceId !== createResource.resource.id) {
      return false;
    }
    const resourceConstraint =
      findAttributeConstraint(createResource.resource.attributes, createResource.kanbanAttribute.attributeId) ||
      new UnknownConstraint();
    return (
      resourceConstraint?.type === column.constraint?.type &&
      this.constraintCanContainValue(resourceConstraint, column.title)
    );
  }

  private constraintCanContainValue(constraint: Constraint, value: any): boolean {
    switch (constraint.type) {
      case ConstraintType.Select:
        const values = (<SelectConstraint>constraint).config?.options?.map(option => option.value) || [];
        return values.includes(value);
      default:
        return true;
    }
  }

  private getAllCreateResources(config: KanbanConfig, permissions: ResourcesPermissions): KanbanCreateResource[] {
    return (config?.stemsConfigs || []).reduce((resources, stemConfig, stemIndex) => {
      const kanbanAttribute = stemConfig.attribute;
      if (kanbanAttribute) {
        const resource = this.getKanbanCardResource(stemConfig);
        const resourcePermissions = queryAttributePermissions(stemConfig.resource || kanbanAttribute, permissions);
        if (resourcePermissions?.rolesWithView?.DataContribute && resource) {
          const linkingResource = this.getNextOrPreviousLinkingResource(stemConfig);
          if (linkingResource) {
            // in this situation we need to create document and link so additional check is needed
            const linkingResourcePermissions = queryAttributePermissions(linkingResource, permissions);
            if (linkingResourcePermissions?.rolesWithView?.DataContribute) {
              resources.push({resource, kanbanAttribute, stemIndex});
            }
          } else {
            resources.push({resource, kanbanAttribute, stemIndex});
          }
        }
      }
      return resources;
    }, []);
  }

  private getNextOrPreviousLinkingResource(stemConfig: KanbanStemConfig): KanbanResource {
    if (
      stemConfig.resource?.resourceType === AttributesResourceType.Collection &&
      Math.abs(stemConfig.resource.resourceIndex - stemConfig.attribute.resourceIndex) >= 1
    ) {
      let index = stemConfig.resource.resourceIndex;
      if (stemConfig.resource.resourceIndex > stemConfig.attribute.resourceIndex) {
        index--;
      } else {
        index++;
      }
      return {
        resourceIndex: index,
        resourceType: AttributesResourceType.LinkType,
        resourceId: this.dataAggregator.getResource(index)?.id,
      };
    }
    return null;
  }

  private getKanbanCardResource(stemConfig: KanbanStemConfig): AttributesResource {
    return createKanbanCardResource(stemConfig.resource || stemConfig.attribute, this.collections, this.linkTypes);
  }
}

function findAggregationConstraint(config: KanbanConfig, collections: Collection[], linkTypes: LinkType[]): Constraint {
  for (const stemConfig of config?.stemsConfigs || []) {
    const constraint = findConstraintByQueryAttribute(stemConfig.aggregation, collections, linkTypes);
    if (constraint) {
      return constraint;
    }
  }

  return new UnknownConstraint();
}

function computeRelativeValue(
  config: KanbanConfig,
  columnsMap: Record<string, Partial<KanbanDataColumn>>,
  otherColumn: Partial<KanbanDataColumn>,
  columnsAggregated: Record<string, AggregatedColumnData>,
  otherAggregated: AggregatedColumnData,
  aggregationConstraint: Constraint
) {
  const values: Record<string, any> = {};
  let total = 0;

  Object.keys(columnsAggregated).forEach(key => {
    values[key] =
      aggregateDataValues(config.aggregation.aggregation, columnsAggregated[key].values, aggregationConstraint, true) ||
      0;
    total += values[key];
  });
  const otherValue =
    aggregateDataValues(config.aggregation.aggregation, otherAggregated.values, aggregationConstraint, true) || 0;
  total += otherValue;

  if (total > 0) {
    Object.keys(columnsAggregated).forEach(key => {
      columnsMap[key].summary = formatRelativeValue(values[key], total);
    });
    otherColumn.summary = formatRelativeValue(otherValue, total);
  }
}

function formatAggregatedValue(
  data: AggregatedColumnData,
  aggregation: KanbanAggregation,
  constraint: Constraint,
  constraintData: ConstraintData
): any {
  const value = aggregateDataValues(aggregation?.aggregation, data.values, constraint);

  if ([DataAggregationType.Count, DataAggregationType.Unique].includes(aggregation?.aggregation)) {
    return value;
  }

  return constraint.createDataValue(value, constraintData).format();
}

function formatRelativeValue(value: any, total: any) {
  const bigNumber = convertToBig((value / total) * 100);
  if (bigNumber) {
    return bigNumber.toFixed(2) + '%';
  }
  return null;
}

function createInitialColumnsMap(
  config: KanbanConfig,
  collections: Collection[],
  linkTypes: LinkType[]
): Record<string, Partial<KanbanDataColumn>> {
  const columnsLength = config?.columns?.length || 0;
  const firstAttribute = config?.stemsConfigs?.[0]?.attribute;
  const filteredColumns =
    (firstAttribute &&
      config?.columns?.filter(column => isColumnValid([], column.title, [firstAttribute], collections, linkTypes))) ||
    [];
  if (firstAttribute && (columnsLength === 0 || filteredColumns.length === 0)) {
    const constraint = findConstraintByQueryAttribute(firstAttribute, collections, linkTypes);
    if (constraint?.type === ConstraintType.Select) {
      const values = (<SelectConstraint>constraint).config?.options?.map(option => option.value) || [];
      return values
        .filter(value => isNotNullOrUndefined(value))
        .reduce(
          (map, value) => ({
            ...map,
            [value]: {cards: [], createdFromAttributes: [firstAttribute], createResources: [], constraint},
          }),
          {}
        );
    }
  }

  return {};
}

function createKanbanCardResource(
  attribute: KanbanResource,
  collections: Collection[],
  linkTypes: LinkType[]
): AttributesResource {
  const resource = findResourceByQueryResource(attribute, collections, linkTypes);
  if (attribute?.resourceType === AttributesResourceType.LinkType) {
    const linkTypeCollections = (<LinkType>resource)?.collectionIds
      ?.map(id => (collections || []).find(coll => coll.id === id))
      ?.filter(collection => !!collection) as [Collection, Collection];
    return {...resource, collections: linkTypeCollections};
  }
  return resource;
}

function createKanbanData(
  currentConfig: KanbanConfig,
  columnsMap: Record<string, Partial<KanbanDataColumn>>,
  otherColumn: Partial<KanbanDataColumn>,
  collections: Collection[],
  linkTypes: LinkType[],
  settings: ViewSettings,
  constraintData: ConstraintData
): KanbanData {
  let newColumnsTitles = Object.keys(columnsMap);
  const selectedAttributes = (currentConfig.stemsConfigs || [])
    .map(conf => conf.attribute)
    .filter(attribute => !!attribute);

  const newColumns: KanbanDataColumn[] = [];
  for (const currentColumn of currentConfig.columns || []) {
    const title = String(currentColumn.title);
    if (
      newColumnsTitles.includes(title) ||
      kanbanAttributesIntersect(currentColumn.createdFromAttributes, selectedAttributes)
    ) {
      const {cards = [], createdFromAttributes = [], constraint = null, summary = null} = columnsMap[title] || {};

      if (isColumnValid(cards, title, currentColumn.createdFromAttributes, collections, linkTypes)) {
        newColumns.push({
          id: getColumnIdOrGenerate(currentColumn),
          title,
          width: getColumnSizeTypeWidth(currentConfig.columnSize),
          cards: sortCards(cards, settings, collections, linkTypes, constraintData),
          createdFromAttributes: mergeKanbanAttributes(
            createdFromAttributes || [],
            currentColumn.createdFromAttributes
          ),
          constraint:
            constraint || constraintForKanbanAttributes(currentColumn.createdFromAttributes, collections, linkTypes),
          summary,
        });
        newColumnsTitles = newColumnsTitles.filter(newColumnTitle => newColumnTitle !== title);
      }
    }
  }

  for (const title of newColumnsTitles) {
    const {cards, createdFromAttributes, constraint, summary} = columnsMap[title];
    newColumns.push({
      id: generateId(),
      title,
      width: getColumnSizeTypeWidth(currentConfig.columnSize),
      cards: sortCards(cards, settings, collections, linkTypes, constraintData),
      createdFromAttributes,
      constraint,
      summary,
    });
  }

  return {
    stemsConfigs: currentConfig?.stemsConfigs,
    columns: newColumns,
    otherColumn: {
      constraint: otherColumn.constraint,
      createdFromAttributes: otherColumn.createdFromAttributes,
      cards: sortCards(otherColumn.cards, settings, collections, linkTypes, constraintData),
      summary: otherColumn.summary,
      id: getColumnIdOrGenerate(currentConfig?.otherColumn),
      width: getColumnSizeTypeWidth(currentConfig?.columnSize),
    },
  };
}

function sortCards(
  cards: KanbanCard[],
  settings: ViewSettings,
  collections: Collection[],
  linkTypes: LinkType[],
  constraintData: ConstraintData
): KanbanCard[] {
  return sortDataResourcesObjectsByViewSettings(
    cards,
    settings,
    collections,
    linkTypes,
    constraintData,
    card => card.dataResource,
    card => card.resource
  );
}

function mergeKanbanAttributes(attributes: KanbanAttribute[], otherAttributes: KanbanAttribute[]): KanbanAttribute[] {
  return [
    ...attributes,
    ...(otherAttributes || []).filter(attribute => !kanbanAttributesIncludesAttribute(attributes, attribute)),
  ];
}

function constraintForKanbanAttributes(
  kanbanAttributes: KanbanAttribute[],
  collections: Collection[],
  linkTypes: LinkType[]
): Constraint {
  for (const kanbanAttribute of kanbanAttributes || []) {
    const attribute = findAttributeByQueryAttribute(kanbanAttribute, collections, linkTypes);
    if (attribute?.constraint) {
      return attribute?.constraint;
    }
  }
  return null;
}

function pickKanbanConfigFromData(config: KanbanConfig, data: KanbanData): KanbanConfig {
  return {
    ...config,
    columns: data.columns.map(column => pickKanbanConfigColumn(column)),
    otherColumn: pickKanbanConfigColumn(data.otherColumn),
  };
}

function pickKanbanConfigColumn(column: KanbanDataColumn): KanbanColumn {
  return (
    column && {
      id: column.id,
      title: column.title,
      createdFromAttributes: column.createdFromAttributes,
      width: column.width,
    }
  );
}

function isColumnValid(
  cards: KanbanCard[],
  title: string,
  attributes: KanbanAttribute[],
  collections: Collection[],
  linkTypes: LinkType[]
): boolean {
  if ((cards || []).length > 0) {
    return true;
  }

  return !(attributes || []).every(attribute => selectedAttributeIsInvalid(title, attribute, collections, linkTypes));
}

function selectedAttributeIsInvalid(
  title: string,
  kanbanAttribute: KanbanAttribute,
  collections: Collection[],
  linkTypes: LinkType[]
): boolean {
  const attribute = findAttributeByQueryAttribute(kanbanAttribute, collections, linkTypes);
  if (!attribute) {
    return true;
  }

  if (attribute.constraint?.type === ConstraintType.Select) {
    if (!attribute.constraint.createDataValue(title).isValid()) {
      return true;
    }
  }

  return false;
}

function getColumnIdOrGenerate(column: KanbanColumn): string {
  return column?.id || generateId();
}

function kanbanAttributesIntersect(
  previousAttributes: KanbanAttribute[],
  selectedAttributes: KanbanAttribute[]
): boolean {
  if (!selectedAttributes) {
    return false;
  }
  if (!previousAttributes || previousAttributes.length === 0) {
    return true;
  }
  return previousAttributes.some(attr => kanbanAttributesIncludesAttribute(selectedAttributes, attr));
}

function kanbanAttributesIncludesAttribute(attributes: KanbanAttribute[], attribute: KanbanAttribute): boolean {
  return attributes.some(attr => deepObjectsEquals(attr, attribute));
}

export function getColumnSizeTypeWidth(sizeType: SizeType): number {
  switch (sizeType) {
    case SizeType.S:
      return 200;
    case SizeType.M:
      return 300;
    case SizeType.L:
      return 400;
    case SizeType.XL:
      return 500;
    default:
      return COLUMN_WIDTH;
  }
}

function getDueHours(dataResource: DataResource, resource: AttributesResource, stemConfig: KanbanStemConfig): number {
  if (stemConfig?.dueDate?.attributeId && isNotNullOrUndefined(dataResource.data?.[stemConfig.dueDate.attributeId])) {
    let expectedFormat = null;
    const constraint = findAttributeConstraint(resource?.attributes, stemConfig.dueDate.attributeId);
    if (constraint && constraint.type === ConstraintType.DateTime) {
      expectedFormat = (constraint.config as DateTimeConstraintConfig).format;
    }

    const parsedDate = parseDateTimeByConstraint(dataResource.data[stemConfig.dueDate.attributeId], constraint);
    const dueDate = checkDueDate(parsedDate, expectedFormat);

    return moment(dueDate).diff(moment(), 'hours', true);
  }

  return null;
}

function checkDueDate(dueDate: Date, format: string): Date {
  if (!dueDate || !format) {
    return dueDate;
  }

  const options = createDateTimeOptions(format);
  if (options.hours) {
    return dueDate;
  }

  return moment(dueDate).endOf('day').toDate();
}
