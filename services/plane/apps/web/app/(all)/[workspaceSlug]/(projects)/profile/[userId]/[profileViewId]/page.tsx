/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
// components
import { PageHead } from "@/components/core/page-title";
import { ProfileIssuesPage } from "@/components/profile/profile-issues";
import type { Route } from "./+types/page";

const ProfilePageHeader = {
  assigned: "Hồ sơ - Công việc được giao",
  created: "Hồ sơ - Công việc đã tạo",
  subscribed: "Hồ sơ - Công việc đang theo dõi",
};

function isValidProfileViewId(viewId: string): viewId is keyof typeof ProfilePageHeader {
  return viewId in ProfilePageHeader;
}

function ProfileIssuesTypePage({ params }: Route.ComponentProps) {
  const { profileViewId } = params;

  if (!isValidProfileViewId(profileViewId)) return null;

  const header = ProfilePageHeader[profileViewId];

  return (
    <>
      <PageHead title={header} />
      <ProfileIssuesPage type={profileViewId} />
    </>
  );
}

export default ProfileIssuesTypePage;
