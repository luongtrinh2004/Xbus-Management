"""Read-only schedule checks for the existing blocked-by relation model."""

from django.db.models import Q

from plane.db.models import IssueRelation
from plane.utils.issue_visibility import visible_issue_ids


def suggested_dependent_dates(blocker_target, dependent_start, dependent_target):
    """Preserve the dependent task's duration when suggesting its new dates."""
    shift = blocker_target - dependent_start
    target = dependent_target + shift if dependent_target else None
    if target and target < blocker_target:
        target = blocker_target
    return blocker_target, target


def dependency_date_conflicts(workspace_id, updates, user):
    """Compare an entire proposed batch, without saving any task or scheduling work."""
    changed = {str(issue_id): dates for issue_id, dates in updates.items()}
    if not changed:
        return []
    relations = (
        IssueRelation.objects.filter(
            Q(issue_id__in=changed) | Q(related_issue_id__in=changed),
            workspace_id=workspace_id,
            relation_type="blocked_by",
            deleted_at__isnull=True,
            issue__deleted_at__isnull=True,
            related_issue__deleted_at__isnull=True,
        )
        .exclude(issue__state__group__in=["completed", "cancelled"])
        .select_related("issue", "related_issue")
    )
    relations = list(relations)
    visible = visible_issue_ids(
        workspace_id,
        user,
        {value for relation in relations for value in (relation.issue_id, relation.related_issue_id)},
    )
    conflicts = []
    for relation in relations:
        if relation.issue_id not in visible or relation.related_issue_id not in visible:
            continue
        dependent, blocker = relation.issue, relation.related_issue
        dependent_dates = changed.get(str(dependent.id), {})
        blocker_dates = changed.get(str(blocker.id), {})
        start = dependent_dates.get("start_date", dependent.start_date)
        target = dependent_dates.get("target_date", dependent.target_date)
        blocker_target = blocker_dates.get("target_date", blocker.target_date)
        if start == dependent.start_date and blocker_target == blocker.target_date:
            continue
        if not start or not blocker_target or blocker_target <= start:
            continue
        suggested_start, suggested_target = suggested_dependent_dates(blocker_target, start, target)
        conflicts.append(
            {
                "blocker_id": str(blocker.id),
                "blocker_name": blocker.name,
                "blocker_target_date": blocker_target.isoformat(),
                "dependent_id": str(dependent.id),
                "dependent_name": dependent.name,
                "dependent_project_id": str(dependent.project_id),
                "start_date": start.isoformat(),
                "target_date": target.isoformat() if target else None,
                "suggested_start_date": suggested_start.isoformat(),
                "suggested_target_date": suggested_target.isoformat() if suggested_target else None,
            }
        )
    return conflicts
