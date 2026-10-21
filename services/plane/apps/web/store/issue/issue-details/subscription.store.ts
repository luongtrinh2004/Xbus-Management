/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set } from "lodash-es";
import { action, makeObservable, observable, runInAction } from "mobx";
// services
import type { EIssueServiceType } from "@plane/types";
import { IssueService } from "@/services/issue/issue.service";
// types
import type { IIssueDetail } from "./root.store";
export interface IIssueSubscriptionStoreActions {
  addSubscription: (issueId: string, isSubscribed: boolean | undefined | null) => void;
  fetchSubscriptions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<boolean>;
  createSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  removeSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
}

export interface IIssueSubscriptionStore extends IIssueSubscriptionStoreActions {
  // observables
  subscriptionMap: Record<string, Record<string, boolean>>; // Record defines subscriptionId as key and link as value
  collaboratorMap: Record<string, string[]>;
  savingCollaborators: Record<string, boolean>;
  fetchCollaborators: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  saveCollaborators: (workspaceSlug: string, projectId: string, issueId: string, ids: string[]) => Promise<void>;
  // helper methods
  getSubscriptionByIssueId: (issueId: string) => boolean | undefined;
}

export class IssueSubscriptionStore implements IIssueSubscriptionStore {
  // observables
  subscriptionMap: Record<string, Record<string, boolean>> = {};
  collaboratorMap: Record<string, string[]> = {};
  savingCollaborators: Record<string, boolean> = {};
  private collaboratorVersions: Record<string, number> = {};
  // root store
  rootIssueDetail: IIssueDetail;
  // services
  issueService;

  constructor(rootStore: IIssueDetail, serviceType: EIssueServiceType) {
    makeObservable(this, {
      // observables
      subscriptionMap: observable,
      collaboratorMap: observable,
      savingCollaborators: observable,
      // actions
      addSubscription: action.bound,
      fetchSubscriptions: action,
      createSubscription: action,
      removeSubscription: action,
      fetchCollaborators: action,
      saveCollaborators: action,
    });
    // root store
    this.rootIssueDetail = rootStore;
    // services
    this.issueService = new IssueService(serviceType);
  }

  // helper methods
  getSubscriptionByIssueId = (issueId: string) => {
    if (!issueId) return undefined;
    const currentUserId = this.rootIssueDetail.rootIssueStore.currentUserId;
    if (!currentUserId) return undefined;
    return this.subscriptionMap[issueId]?.[currentUserId] ?? undefined;
  };

  addSubscription = (issueId: string, isSubscribed: boolean | undefined | null) => {
    const currentUserId = this.rootIssueDetail.rootIssueStore.currentUserId;
    if (!currentUserId) throw new Error("user id not available");

    runInAction(() => {
      set(this.subscriptionMap, [issueId, currentUserId], isSubscribed ?? false);
    });
  };

  fetchSubscriptions = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const subscription = await this.issueService.getIssueNotificationSubscriptionStatus(
      workspaceSlug,
      projectId,
      issueId
    );
    this.addSubscription(issueId, subscription?.subscribed);
    return subscription?.subscribed;
  };

  fetchCollaborators = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const version = this.collaboratorVersions[issueId] ?? 0;
    const rows = await this.issueService.getIssueSubscribers(workspaceSlug, projectId, issueId);
    if (version !== (this.collaboratorVersions[issueId] ?? 0) || this.savingCollaborators[issueId]) return;
    runInAction(() => {
      this.collaboratorMap[issueId] = rows.map((row) => row.subscriber);
      const currentUserId = this.rootIssueDetail.rootIssueStore.currentUserId;
      if (currentUserId) this.addSubscription(issueId, this.collaboratorMap[issueId].includes(currentUserId));
    });
  };

  saveCollaborators = async (workspaceSlug: string, projectId: string, issueId: string, ids: string[]) => {
    if (this.savingCollaborators[issueId]) return;
    this.collaboratorVersions[issueId] = (this.collaboratorVersions[issueId] ?? 0) + 1;
    runInAction(() => {
      this.savingCollaborators[issueId] = true;
    });
    try {
      const rows = await this.issueService.updateIssueSubscribers(workspaceSlug, projectId, issueId, ids);
      runInAction(() => {
        this.collaboratorMap[issueId] = rows.map((row) => row.subscriber);
        const currentUserId = this.rootIssueDetail.rootIssueStore.currentUserId;
        if (currentUserId) this.addSubscription(issueId, this.collaboratorMap[issueId].includes(currentUserId));
      });
    } finally {
      this.collaboratorVersions[issueId] = (this.collaboratorVersions[issueId] ?? 0) + 1;
      runInAction(() => {
        this.savingCollaborators[issueId] = false;
      });
    }
  };

  createSubscription = async (workspaceSlug: string, projectId: string, issueId: string) => {
    try {
      const currentUserId = this.rootIssueDetail.rootIssueStore.currentUserId;
      if (!currentUserId) throw new Error("user id not available");

      runInAction(() => {
        set(this.subscriptionMap, [issueId, currentUserId], true);
      });

      await this.issueService.subscribeToIssueNotifications(workspaceSlug, projectId, issueId);
      this.collaboratorVersions[issueId] = (this.collaboratorVersions[issueId] ?? 0) + 1;
      runInAction(() => {
        const existing = this.collaboratorMap[issueId];
        if (existing && !existing.includes(currentUserId)) this.collaboratorMap[issueId] = [...existing, currentUserId];
      });
    } catch (error) {
      this.fetchSubscriptions(workspaceSlug, projectId, issueId);
      throw error;
    }
  };

  removeSubscription = async (workspaceSlug: string, projectId: string, issueId: string) => {
    try {
      const currentUserId = this.rootIssueDetail.rootIssueStore.currentUserId;
      if (!currentUserId) throw new Error("user id not available");

      runInAction(() => {
        set(this.subscriptionMap, [issueId, currentUserId], false);
      });

      await this.issueService.unsubscribeFromIssueNotifications(workspaceSlug, projectId, issueId);
      this.collaboratorVersions[issueId] = (this.collaboratorVersions[issueId] ?? 0) + 1;
      runInAction(() => {
        if (this.collaboratorMap[issueId]) {
          this.collaboratorMap[issueId] = this.collaboratorMap[issueId].filter((id) => id !== currentUserId);
        }
      });
    } catch (error) {
      this.fetchSubscriptions(workspaceSlug, projectId, issueId);
      throw error;
    }
  };
}
