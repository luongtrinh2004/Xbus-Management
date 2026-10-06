/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { CheckboxField } from "@makeplane/propel/components/checkbox-field";
import type { IWebhook } from "@plane/types";

export const INDIVIDUAL_WEBHOOK_OPTIONS: {
  key: keyof IWebhook;
  label: string;
  description: string;
}[] = [
  {
    key: "project",
    label: "Dự án",
    description: "Dự án được tạo, cập nhật hoặc xóa",
  },
  {
    key: "cycle",
    label: "Chu kỳ",
    description: "Chu kỳ được tạo, cập nhật hoặc xóa",
  },
  {
    key: "issue",
    label: "Công việc",
    description: "Công việc được tạo, cập nhật, xóa hoặc thêm vào chu kỳ hay nhóm công việc",
  },
  {
    key: "module",
    label: "Nhóm công việc",
    description: "Nhóm công việc được tạo, cập nhật hoặc xóa",
  },
  {
    key: "issue_comment",
    label: "Bình luận công việc",
    description: "Bình luận được đăng, cập nhật hoặc xóa",
  },
];

type Props = {
  control: Control<IWebhook, any>;
};

export function WebhookIndividualEventOptions({ control }: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 px-6 lg:grid-cols-2">
      {INDIVIDUAL_WEBHOOK_OPTIONS.map((option) => (
        <Controller
          key={option.key}
          control={control}
          name={option.key}
          render={({ field: { onChange, value } }) => (
            <CheckboxField
              name={option.key}
              label={option.label}
              size="lg"
              description={option.description}
              stretch="full"
              checked={value === true}
              onCheckedChange={onChange}
            />
          )}
        />
      ))}
    </div>
  );
}
