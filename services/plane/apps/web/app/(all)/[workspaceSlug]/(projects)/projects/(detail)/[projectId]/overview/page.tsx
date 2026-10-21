import { ProjectOverviewRoot } from "@/components/project/overview/root";
import type { Route } from "./+types/page";

export default function ProjectOverviewPage({ params }: Route.ComponentProps) {
  return (
    <ProjectOverviewRoot
      key={`${params.workspaceSlug}:${params.projectId}`}
      workspaceSlug={params.workspaceSlug}
      projectId={params.projectId}
    />
  );
}
