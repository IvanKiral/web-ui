import {DocumentInfoService} from '../../../services/document-info.service';
import {DocumentNavigationService} from '../../../services/document-navigation.service';
import {Component} from '@angular/core';
import * as _ from 'lodash';
import {DocumentService} from '../../../services/document.service';
import {style, state, animate, transition, trigger, keyframes} from '@angular/animations';

@Component({
  selector: 'views-pick-item',
  template: require('./pick-item.component.html'),
  styles: [require('./pick-item.component.scss').toString()],
  animations: [
    trigger('animateIn', [
      state('in', style({transform: 'translateX(0)'})),
      transition('void => *', [
        animate('0.6s', keyframes([
          style({transform: 'translateX(100%)', offset: 0}),
          style({transform: 'translateX(0)',     offset: 1.0})
        ]))
      ]),
      transition('* => void', [
        animate('0.6s', keyframes([
          style({transform: 'translateX(0)',     offset: 0}),
          style({transform: 'translateX(100%)',  offset: 1.0})
        ]))
      ])
    ]),
    trigger('animateWidth', [
      state('in', style({width: '*'})),
      transition('void => *', [
        animate('0.6s', keyframes([
          style({width: 0, offset: 0}),
          style({width: '*', offset: 1})
        ]))
      ]),
      transition('* => void', [
        animate('0.6s', keyframes([
          style({width: '*', offset: 0}),
          style({width: 0, offset: 1})
        ]))
      ])
    ])
  ]
})

export class PickItemComponent {
  public actions: any[];
  public activeRoutes: any[];

  constructor(public documentService: DocumentService,
              public documentInfoService: DocumentInfoService,
              private documentNavigationService: DocumentNavigationService) {
  }

  public ngOnInit() {
    this.activeRoutes = this.documentNavigationService.activeRoutes();
    this.documentService.fetchFilterResultsFromFilter(this.documentInfoService.lastFilter);
    this.actions = [
      {
        id: 'history',
        icon: 'fa-history',
        title: 'Show History'
      },
      {
        id: 'rights',
        icon: 'fa-id-card-o',
        title: 'Show rights'
      }
    ];
  }

  public actionClick(dataPayload) {
    _.map(this.actions, oneAction => {
      if (oneAction.id !== dataPayload.action.id) {
        oneAction.active = false;
      }
    });
    let action: any = _.find(this.actions, dataPayload.action);
    if (action) {
      action.active = !action.active;
    }
  }

  public activeAction() {
    return _.find(this.actions, {active: true});
  }

  public selectItem(document) {
    this.documentService.fetchDocumentDetailFromId(document._id);
  }

  public onFilterChanged(dataPayload) {
    this.documentInfoService.fetchDocumentPreviewsFromFilter(dataPayload);
    this.documentService.fetchFilterResultsFromFilter(dataPayload);
  }

  public onNavigationClick(route) {
    let parent = this.documentNavigationService.getParentForChildRoute(route);
    this.documentNavigationService.handleItemSelect({parent: parent.data, child: route.data});
  }
}
