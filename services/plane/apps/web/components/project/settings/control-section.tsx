/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "react-router";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@makeplane/propel/components/button";
// components
import { SettingsBoxedControlItem } from "@/components/settings/boxed-control-item";
// hooks
import { useProject } from "@/hooks/store/use-project";
// local imports
import { ArchiveRestoreProjectModal } from "../archive-restore-modal";
import { DeleteProjectModal } from "../delete-project-modal";

type Props = {
  projectId: string;
};

export const GeneralProjectSettingsControlSection = observer(function GeneralProjectSettingsControlSection(
  props: Props
) {
  const { projectId } = props;
  // states
  const [selectProject, setSelectedProject] = useState<string | null>(null);
  const [archiveProject, setArchiveProject] = useState<boolean>(false);
  // params
  const { workspaceSlug } = useParams();
  // store hooks
  const { currentProjectDetails } = useProject();
  // translation
  const { t } = useTranslation();

  if (!currentProjectDetails) return null;

  return (
    <div className="mt-10">
      {workspaceSlug && (
        <ArchiveRestoreProjectModal
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          isOpen={archiveProject}
          onClose={() => setArchiveProject(false)}
          archive
        />
      )}
      <DeleteProjectModal
        project={currentProjectDetails}
        isOpen={Boolean(selectProject)}
        onClose={() => setSelectedProject(null)}
      />
      <div className="rounded-lg border border-subtle bg-layer-2">
        {/* Project Selector */}
        <SettingsBoxedControlItem
          className="rounded-b-none border-0 border-b"
          title={t("archive")}
          description={
            "Lưu trữ dự án sẽ hủy liệt kê dự án của bạn khỏi thanh điều hướng bên, nhưng bạn vẫn có thể truy cập nó từ trang dự án. Bạn có thể khôi phục hoặc xóa dự án bất cứ lúc nào."
          }
          control={
            <Button
              variant="secondary"
              size="sm"
              stretch="auto"
              label={t("archive")}
              onClick={() => setArchiveProject(true)}
            />
          }
        />
        {/* Format Selector */}
        <SettingsBoxedControlItem
          className="rounded-t-none border-0"
          title={t("delete")}
          description={
            "Khi xóa dự án, tất cả dữ liệu và tài nguyên trong dự án đó sẽ bị xóa vĩnh viễn và không thể khôi phục."
          }
          control={
            <Button
              variant="danger-outline"
              size="sm"
              stretch="auto"
              label={t("delete")}
              onClick={() => setSelectedProject(currentProjectDetails.id ?? null)}
            />
          }
        />
      </div>
    </div>
  );
});
