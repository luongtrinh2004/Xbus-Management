/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
// types
import type { Route } from "./+types/page";
// local
import { WorkspaceCreateForm } from "./form";

const WorkspaceCreatePage = observer(function WorkspaceCreatePage(_props: Route.ComponentProps) {
  return (
    <PageWrapper
      header={{
        title: "Tạo không gian làm việc mới trên hệ thống này.",
        description: "Sau khi tạo không gian làm việc, hãy mời người dùng trong phần Cài đặt.",
      }}
    >
      <WorkspaceCreateForm />
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: "Tạo không gian làm việc - Quản trị hệ thống" }];

export default WorkspaceCreatePage;
