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
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  EventEmitter,
  Output,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import {User} from '../../../core/store/users/user';
import {Organization} from '../../../core/store/organizations/organization';
import {Project} from '../../../core/store/projects/project';
import {ResourceType} from '../../../core/model/resource-type';
import {BehaviorSubject, Subscription} from 'rxjs';
import {View} from '../../../core/store/views/view';
import {KeyCode} from '../../../shared/key-code';
import {isNotNullOrUndefined, isNullOrUndefined} from '../../../shared/utils/common.utils';
import {isEmailValid} from '../../../shared/utils/email.utils';
import {generateCorrelationId, userIsManagerInWorkspace} from '../../../shared/utils/resource.utils';
import {ClipboardService} from '../../../core/service/clipboard.service';
import {UserRolesInResourcePipe} from '../../../shared/pipes/user-roles-in-resource.pipe';
import {Permission} from '../../../core/store/permissions/permissions';
import {map, skip} from 'rxjs/operators';
import {containsSameElements} from '../../../shared/utils/array.utils';

@Component({
  selector: 'share-view-dialog-body',
  templateUrl: './share-view-dialog-body.component.html',
  styleUrls: ['./share-view-dialog-body.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareViewDialogBodyComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  public currentUser: User;

  @Input()
  public organization: Organization;

  @Input()
  public project: Project;

  @Input()
  public view: View;

  @Input()
  public users: User[];

  @Output()
  public submit = new EventEmitter<{
    permissions: Permission[];
    newUsers: User[];
    newUsersRoles: Record<string, string[]>;
  }>();

  @Output()
  public rolesChanged = new EventEmitter<boolean>();

  public canAddNewUsers: boolean;
  public staticUsers: User[] = [];
  public initialUserRoles: Record<string, string[]> = {};

  public changeableUsers$ = new BehaviorSubject<User[]>([]);
  public newUsers$ = new BehaviorSubject<User[]>([]);
  public userRoles$ = new BehaviorSubject<Record<string, string[]>>({});

  public viewShareUrl$ = new BehaviorSubject<string>('');
  public text$ = new BehaviorSubject<string>('');
  public suggestions$ = new BehaviorSubject<string[]>([]);
  public selectedIndex$ = new BehaviorSubject<number>(null);

  public readonly viewResourceType = ResourceType.View;

  private subscriptions = new Subscription();

  constructor(private clipboardService: ClipboardService, private userRolesInResourcePipe: UserRolesInResourcePipe) {}

  public ngOnInit() {
    this.parseViewShareUrl();
    this.subscribeToRoles();
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (this.currentUser && this.organization && this.project && this.view) {
      this.initUsers(this.currentUser, this.organization, this.project);
    }
    if (changes.organization && changes.project && changes.currentUser) {
      this.checkCanAddNewUsers();
    }
  }

  public copyToClipboard() {
    this.clipboardService.copy(this.viewShareUrl$.getValue());
  }

  public onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case KeyCode.Enter:
        this.onEnter();
        return;
      case KeyCode.ArrowUp:
      case KeyCode.ArrowDown:
        this.onUpAndDownArrowKeysDown(event);
        return;
    }
  }

  private onEnter() {
    this.addItem(this.text$.getValue().trim());
  }

  private addItem(text: string) {
    const selectedIndex = this.selectedIndex$.getValue();
    const suggestions = this.suggestions$.getValue();

    if (isNotNullOrUndefined(selectedIndex) && selectedIndex < suggestions.length) {
      this.addUserWithEmail(suggestions[selectedIndex]);
    } else {
      const userWasAdded = [
        ...this.staticUsers,
        ...this.changeableUsers$.getValue(),
        ...this.newUsers$.getValue(),
      ].find(u => u.email.toLowerCase() === text.toLowerCase());
      const user = this.users.find(u => u.email.toLowerCase() === text.toLowerCase());
      if (!userWasAdded) {
        if (user) {
          this.addUser(user);
        } else {
          this.addNewUser(text);
        }
      }
    }
  }

  private addUserWithEmail(email: string) {
    const user = this.users.find(u => u.email === email);
    if (user) {
      this.addUser(user);
    }
  }

  private addUser(user: User) {
    this.userRoles$.next({...this.userRoles$.getValue(), [user.id]: []});
    this.changeableUsers$.next([...this.changeableUsers$.getValue(), user]);
    this.text$.next('');
  }

  private addNewUser(text: string) {
    if (this.canAddNewUsers && isEmailValid(text)) {
      const newUser: User = {correlationId: generateCorrelationId(), email: text, groupsMap: {}};
      this.userRoles$.next({...this.userRoles$.getValue(), [newUser.correlationId]: []});
      this.newUsers$.next([...this.newUsers$.getValue(), newUser]);
      this.text$.next('');
    }
  }

  public onAddNewUser() {
    this.onEnter();
  }

  private onUpAndDownArrowKeysDown(event: KeyboardEvent) {
    const suggestions = this.suggestions$.getValue();
    if (suggestions.length === 0) {
      return;
    }

    event.preventDefault();
    const direction = event.code === KeyCode.ArrowUp ? -1 : 1;

    const selectedIndex = this.selectedIndex$.getValue();
    const newIndex = isNullOrUndefined(selectedIndex) ? 0 : selectedIndex + direction;
    if (newIndex >= 0 && newIndex < suggestions.length) {
      this.selectedIndex$.next(newIndex);
    }
  }

  public deleteUser(user: User) {
    const userRoles = {...this.userRoles$.getValue()};
    if (user.id) {
      delete userRoles[user.id];
      this.changeableUsers$.next(this.changeableUsers$.getValue().filter(u => u.id !== user.id));
    } else if (user.correlationId) {
      delete userRoles[user.correlationId];
      this.newUsers$.next(this.newUsers$.getValue().filter(u => u.correlationId !== user.correlationId));
    }

    this.userRoles$.next(userRoles);
  }

  public onNewRoles(user: User, roles: string[]) {
    this.userRoles$.next({...this.userRoles$.getValue(), [user.id || user.correlationId]: roles});
  }

  public suggest() {
    const textLowerCase = this.text$.getValue().toLowerCase();
    const newSuggestions = this.users
      .filter(user => !this.isUserPresented(user))
      .map(user => user.email)
      .filter(email => email.toLowerCase().includes(textLowerCase));

    this.suggestions$.next(newSuggestions);
    this.recomputeSelectedIndex();
  }

  private isUserPresented(user: User): boolean {
    return (
      !!this.changeableUsers$.getValue().find(u => u.id === user.id) || !!this.staticUsers.find(u => u.id === user.id)
    );
  }

  private recomputeSelectedIndex() {
    const text = this.text$.getValue();
    const selectedIndex = this.selectedIndex$.getValue();
    const suggestions = this.suggestions$.getValue();

    if (suggestions.length === 0 || !text) {
      this.selectedIndex$.next(null);
    } else if (!isNullOrUndefined(selectedIndex)) {
      this.selectedIndex$.next(Math.min(selectedIndex, suggestions.length - 1));
    }
  }

  public onInputChanged(value: string) {
    this.text$.next(value);
  }

  public onSuggestionClick(text: string) {
    this.addItem(text);
  }

  private getUserPermissionsInView(user: User): Permission {
    return this.view.permissions.users.find(permission => permission.id === user.id);
  }

  private initUsers(currentUser: User, organization: Organization, project: Project) {
    for (const user of this.users || []) {
      if (userIsManagerInWorkspace(user, organization, project) || user.id === currentUser.id) {
        this.addUserToStaticIfNotPresented(user, organization, project);
      } else if (((this.view.permissions && this.view.permissions.users) || []).find(u => u.id === user.id)) {
        this.addUserToChangeableIfNotPresented(user, organization, project);
      }
    }
    this.checkRemovedUsers();
  }

  private addUserToStaticIfNotPresented(user: User, organization: Organization, project: Project) {
    if (!this.isUserPresented(user)) {
      this.staticUsers.push(user);
      this.initRolesForUser(user, organization, project);
    }
  }

  private initRolesForUser(user: User, organization: Organization, project: Project) {
    const roles = this.userRolesInResourcePipe.transform(user, this.view, this.viewResourceType, organization, project);
    this.userRoles$.next({...this.userRoles$.getValue(), [user.id]: roles});
    this.initialUserRoles[user.id] = roles;
  }

  private addUserToChangeableIfNotPresented(user: User, organization: Organization, project: Project) {
    if (!this.isUserPresented(user)) {
      this.changeableUsers$.next([...this.changeableUsers$.getValue(), user]);
      this.initRolesForUser(user, organization, project);
    }
  }

  private checkRemovedUsers() {
    const userIds = this.users.map(user => user.id);
    this.staticUsers = this.staticUsers.filter(user => userIds.includes(user.id));
    this.changeableUsers$.next(this.changeableUsers$.getValue().filter(user => userIds.includes(user.id)));
  }

  public trackByUser(index: number, user: User): string {
    return user.id || user.correlationId;
  }

  public onSubmit() {
    const userRoles = this.userRoles$.getValue();
    const newUsers = this.newUsers$.getValue();
    const changeableUsers = this.changeableUsers$.getValue();

    const changeablePermissions: Permission[] = Object.keys(userRoles)
      .filter(id => changeableUsers.find(user => user.id === id))
      .map(id => ({id, roles: userRoles[id]}));

    const staticPermissions = this.staticUsers
      .map(user => this.getUserPermissionsInView(user))
      .filter(permission => permission && permission.roles && permission.roles.length > 0);

    const permissions = [...changeablePermissions, ...staticPermissions];

    const newUsersFiltered: User[] = Object.keys(userRoles)
      .map(id => newUsers.find(user => user.correlationId === id))
      .filter(user => !!user)
      .filter(user => (userRoles[user.correlationId] || []).length > 0)
      .map(user => ({...user, groupsMap: {[this.organization.id]: []}}));

    this.submit.next({permissions, newUsers: newUsersFiltered, newUsersRoles: userRoles});
  }

  private subscribeToRoles() {
    this.subscriptions.add(
      this.userRoles$
        .asObservable()
        .pipe(
          skip(1),
          map(roles => this.viewPermissionsChanged(this.initialUserRoles, roles))
        )
        .subscribe(changed => this.rolesChanged.emit(changed))
    );
  }

  private viewPermissionsChanged(
    initialUserPermissions: Record<string, string[]>,
    currentUserPermissions: Record<string, string[]>
  ): boolean {
    if (!initialUserPermissions || !currentUserPermissions) {
      return false;
    }

    if (Object.keys(initialUserPermissions).length !== Object.keys(currentUserPermissions).length) {
      return true;
    }

    for (const id of Object.keys(initialUserPermissions)) {
      const currentRoles = currentUserPermissions[id];
      const userRoles = initialUserPermissions[id];
      if (isNullOrUndefined(currentRoles) || !containsSameElements(currentRoles, userRoles)) {
        return true;
      }
    }

    return false;
  }

  private parseViewShareUrl() {
    const currentUrl = window.location.href;
    const match = currentUrl.match('(.+/w/[^/]+/[^/]+/).*');
    if (match && match[1]) {
      this.viewShareUrl$.next(match[1] + 'view;vc=' + this.view.code);
    }
  }

  public ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private checkCanAddNewUsers() {
    this.canAddNewUsers = userIsManagerInWorkspace(this.currentUser, this.organization, this.project);
  }
}
