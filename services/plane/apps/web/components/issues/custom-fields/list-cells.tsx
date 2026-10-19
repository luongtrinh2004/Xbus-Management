/** Copyright (c) 2023-present Plane Software, Inc. and contributors. SPDX-License-Identifier: AGPL-3.0-only */
import { observer } from "mobx-react";
import { useCustomFields } from "@/hooks/store/use-custom-fields";
import { useListTable } from "../issue-layouts/list/table-context";
import { CustomFieldValueEditor } from "./value";

export const CustomFieldListCells = observer(function CustomFieldListCells({
  workspaceSlug,
  projectId,
  issueId,
  disabled,
}: {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
}) {
  const columns = useListTable();
  const store = useCustomFields();
  if (!columns) return null;
  return (
    <>
      {columns.map((column, index) => {
        if (!column.customFieldId) return null;
        const field = store.fields(projectId).find((item) => item.id === column.customFieldId);
        return (
          <div className="asana-list-cell" key={column.key} style={{ gridColumn: index + 1, gridRow: 1 }}>
            {field && (
              <CustomFieldValueEditor
                field={field}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                issueId={issueId}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}
    </>
  );
});
