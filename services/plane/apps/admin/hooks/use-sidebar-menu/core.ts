/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { BrainCog } from "lucide-react";
// plane imports
import { ImageOutline, LockOutline, MailOutline, SettingsOutline, WorkspaceOutline } from "@makeplane/propel/icons";
// types
import type { TSidebarMenuItem } from "./types";

export type TCoreSidebarMenuKey = "general" | "email" | "workspace" | "authentication" | "ai" | "image";

export const coreSidebarMenuLinks: Record<TCoreSidebarMenuKey, TSidebarMenuItem> = {
  general: {
    Icon: SettingsOutline,
    name: "General",
    description: "Xem thông tin định danh và thông số chính của hệ thống.",
    href: `/general/`,
  },
  email: {
    Icon: MailOutline,
    name: "Email",
    description: "Cấu hình SMTP.",
    href: `/email/`,
  },
  workspace: {
    Icon: WorkspaceOutline,
    name: "Workspaces",
    description: "Quản lý tất cả không gian làm việc trên hệ thống.",
    href: `/workspace/`,
  },
  authentication: {
    Icon: LockOutline,
    name: "Authentication",
    description: "Thiết lập phương thức xác thực.",
    href: `/authentication/`,
  },
  ai: {
    Icon: BrainCog,
    name: "Artificial intelligence",
    description: "Cấu hình thông tin kết nối OpenAI.",
    href: `/ai/`,
  },
  image: {
    Icon: ImageOutline,
    name: "Images in Plane",
    description: "Cho phép thư viện ảnh bên thứ ba.",
    href: `/image/`,
  },
};
