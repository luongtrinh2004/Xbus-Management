/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { BoardOutline, ListOutline, TimelineOutline } from "@makeplane/propel/icons";
import type { IBaseLayoutConfig } from "@plane/types";

export const BASE_LAYOUTS: IBaseLayoutConfig[] = [
  {
    key: "list",
    icon: ListOutline,
    label: "Bố cục danh sách",
  },
  {
    key: "kanban",
    icon: BoardOutline,
    label: "Bố cục kanban",
  },
  {
    key: "gantt",
    icon: TimelineOutline,
    label: "Biểu đồ Gantt",
  },
];
