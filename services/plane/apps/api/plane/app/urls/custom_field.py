# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.
from django.urls import path
from plane.app.views.custom_field import CustomFieldList, CustomFieldDetail, CustomFieldValues, CustomFieldValuesBulk

urlpatterns = [
    path("workspaces/<str:slug>/projects/<uuid:project_id>/custom-fields/", CustomFieldList.as_view()),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/custom-fields/<uuid:field_id>/", CustomFieldDetail.as_view()
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/custom-field-values/",
        CustomFieldValues.as_view(),
    ),
    path("workspaces/<str:slug>/projects/<uuid:project_id>/custom-field-values/", CustomFieldValuesBulk.as_view()),
]
