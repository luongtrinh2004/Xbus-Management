"""Current membership checks for data returned outside the task detail endpoint."""

from django.db.models import Exists, OuterRef, Q

from plane.db.models import Issue, ProjectMember, WorkspaceMember


def eligible_issue_members(issue):
    workspace_members = WorkspaceMember.objects.filter(
        workspace_id=issue.workspace_id,
        is_active=True,
        member__is_active=True,
        workspace__deleted_at__isnull=True,
    ).values("member_id")
    members = ProjectMember.objects.filter(
        workspace_id=issue.workspace_id,
        project_id=issue.project_id,
        project__deleted_at__isnull=True,
        is_active=True,
        member_id__in=workspace_members,
    )
    if not issue.project.guest_view_all_features:
        members = members.filter(~Q(role=5) | Q(member_id=issue.created_by_id))
    return members


def visible_issue_ids(workspace_id, user, issue_ids):
    if (
        not user
        or not user.is_active
        or not WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            workspace__deleted_at__isnull=True,
            member=user,
            is_active=True,
        ).exists()
    ):
        return set()
    memberships = ProjectMember.objects.filter(
        workspace_id=workspace_id,
        project_id=OuterRef("project_id"),
        member=user,
        is_active=True,
    )
    return set(
        Issue.objects.filter(
            workspace_id=workspace_id,
            pk__in=issue_ids,
            project__workspace_id=workspace_id,
            project__deleted_at__isnull=True,
            is_draft=False,
        )
        .annotate(
            active_project_member=Exists(memberships),
            full_project_member=Exists(memberships.exclude(role=5)),
        )
        .filter(active_project_member=True)
        .filter(Q(full_project_member=True) | Q(project__guest_view_all_features=True) | Q(created_by=user))
        .values_list("id", flat=True)
    )
