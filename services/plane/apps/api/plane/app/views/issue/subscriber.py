# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .. import BaseViewSet
from plane.app.serializers import IssueSubscriberSerializer
from plane.app.permissions import ProjectEntityPermission, ProjectLitePermission
from plane.utils.issue_visibility import eligible_issue_members
from plane.db.models import Issue, IssueSubscriber, ProjectMember, WorkspaceMember


class SubscriberSelectionSerializer(serializers.Serializer):
    subscriber_ids = serializers.ListField(child=serializers.UUIDField(), max_length=500, allow_empty=True)

    def validate_subscriber_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Duplicate subscribers are not allowed.")
        return value


class IssueSubscriberViewSet(BaseViewSet):
    serializer_class = IssueSubscriberSerializer
    model = IssueSubscriber

    permission_classes = [ProjectEntityPermission]

    def get_permissions(self):
        if self.action in ["subscribe", "unsubscribe", "subscription_status"]:
            self.permission_classes = [ProjectLitePermission]
        else:
            self.permission_classes = [ProjectEntityPermission]

        return super().get_permissions()

    def scoped_issue(self, request, slug, project_id, issue_id, *, lock=False, write=False):
        """Subscription never grants visibility beyond Plane's existing project/guest scope."""
        if not WorkspaceMember.objects.filter(
            workspace__slug=slug, member=request.user, is_active=True, member__is_active=True
        ).exists():
            raise PermissionDenied()
        membership = get_object_or_404(
            ProjectMember.objects, workspace__slug=slug, project_id=project_id, member=request.user, is_active=True
        )
        issues = Issue.objects.select_related("project").filter(
            workspace__slug=slug,
            workspace__deleted_at__isnull=True,
            project_id=project_id,
            project__deleted_at__isnull=True,
            is_draft=False,
        )
        if membership.role == 5 and not membership.project.guest_view_all_features:
            issues = issues.filter(created_by=request.user)
        if lock:
            issues = issues.select_for_update(of=("self",))
        issue = get_object_or_404(issues, pk=issue_id)
        if write and (issue.archived_at or issue.project.archived_at):
            raise ValidationError({"issue": "Archived work items cannot be edited."})
        return issue

    def eligible_subscribers(self, issue):
        return eligible_issue_members(issue).values_list("member_id", flat=True)

    def list(self, request, slug, project_id, issue_id):
        issue = self.scoped_issue(request, slug, project_id, issue_id)
        subscribers = IssueSubscriber.objects.filter(
            issue=issue, subscriber_id__in=self.eligible_subscribers(issue)
        ).order_by("created_at", "id")
        return Response(IssueSubscriberSerializer(subscribers, many=True).data)

    def create(self, request, slug, project_id, issue_id):
        subscriber_id = serializers.UUIDField().run_validation(
            request.data.get("subscriber") if isinstance(request.data, dict) else None
        )
        with transaction.atomic():
            issue = self.scoped_issue(request, slug, project_id, issue_id, lock=True, write=True)
            if subscriber_id not in set(self.eligible_subscribers(issue)):
                raise ValidationError({"subscriber": "Choose an active project member who can view this work item."})
            subscriber, created = IssueSubscriber.objects.get_or_create(
                issue=issue,
                subscriber_id=subscriber_id,
                defaults={
                    "project": issue.project,
                    "workspace": issue.workspace,
                    "created_by": request.user,
                    "updated_by": request.user,
                },
            )
        return Response(
            IssueSubscriberSerializer(subscriber).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def replace(self, request, slug, project_id, issue_id):
        serializer = SubscriberSelectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        desired = set(serializer.validated_data["subscriber_ids"])
        with transaction.atomic():
            issue = self.scoped_issue(request, slug, project_id, issue_id, lock=True, write=True)
            if not desired.issubset(set(self.eligible_subscribers(issue))):
                raise ValidationError({"subscriber_ids": "Choose active project members who can view this work item."})
            existing = IssueSubscriber.objects.filter(issue=issue)
            existing.exclude(subscriber_id__in=desired).delete()
            previous = set(existing.values_list("subscriber_id", flat=True))
            IssueSubscriber.objects.bulk_create(
                [
                    IssueSubscriber(
                        issue=issue,
                        project=issue.project,
                        workspace=issue.workspace,
                        subscriber_id=subscriber_id,
                        created_by=request.user,
                        updated_by=request.user,
                    )
                    for subscriber_id in desired - previous
                ]
            )
            result = IssueSubscriberSerializer(
                IssueSubscriber.objects.filter(issue=issue).order_by("created_at", "id"), many=True
            ).data
        return Response(result)

    def destroy(self, request, slug, project_id, issue_id, subscriber_id):
        with transaction.atomic():
            issue = self.scoped_issue(request, slug, project_id, issue_id, lock=True, write=True)
            IssueSubscriber.objects.filter(issue=issue, subscriber_id=subscriber_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def subscribe(self, request, slug, project_id, issue_id):
        with transaction.atomic():
            issue = self.scoped_issue(request, slug, project_id, issue_id, lock=True, write=True)
            subscriber, created = IssueSubscriber.objects.get_or_create(
                issue=issue,
                subscriber=request.user,
                defaults={
                    "project": issue.project,
                    "workspace": issue.workspace,
                    "created_by": request.user,
                    "updated_by": request.user,
                },
            )
        return Response(
            IssueSubscriberSerializer(subscriber).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def unsubscribe(self, request, slug, project_id, issue_id):
        with transaction.atomic():
            issue = self.scoped_issue(request, slug, project_id, issue_id, lock=True)
            IssueSubscriber.objects.filter(issue=issue, subscriber=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def subscription_status(self, request, slug, project_id, issue_id):
        issue = self.scoped_issue(request, slug, project_id, issue_id)
        subscribed = IssueSubscriber.objects.filter(issue=issue, subscriber=request.user).exists()
        return Response({"subscribed": subscribed})
