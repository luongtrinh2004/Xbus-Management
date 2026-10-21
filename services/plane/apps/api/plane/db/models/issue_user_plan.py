# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
from django.conf import settings
from django.db import models
from .base import BaseModel


class IssueUserPlan(BaseModel):
    """Private organization of an assigned Plane work item; never its shared state or dates."""

    BUCKETS = [(value, value) for value in ("recently_assigned", "today", "upcoming", "later")]
    issue = models.ForeignKey("db.Issue", on_delete=models.CASCADE, related_name="user_plans")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="issue_plans")
    bucket = models.CharField(max_length=20, choices=BUCKETS, default="recently_assigned")
    sort_order = models.FloatField(default=0)

    class Meta:
        db_table = "issue_user_plans"
        constraints = [
            models.UniqueConstraint(fields=["user", "issue"], condition=models.Q(deleted_at__isnull=True), name="unique_active_issue_user_plan"),
            models.CheckConstraint(condition=models.Q(bucket__in=["recently_assigned", "today", "upcoming", "later"]), name="valid_issue_user_plan_bucket"),
        ]
