# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date

import pytest

from plane.api.serializers.issue import IssueSerializer
from plane.app.serializers.issue import IssueCreateSerializer
from plane.db.models import Issue


@pytest.mark.unit
@pytest.mark.parametrize("serializer_class", [IssueCreateSerializer, IssueSerializer])
class TestIssueDateRange:
    @pytest.mark.parametrize("payload", [
        {"start_date": "2026-10-22"},
        {"target_date": "2026-10-09"},
        {"start_date": "2026-10-22", "target_date": "2026-10-21"},
    ])
    def test_rejects_invalid_range_when_patching_one_or_both_dates(self, serializer_class, payload):
        issue = Issue(start_date=date(2026, 10, 10), target_date=date(2026, 10, 20))
        serializer = serializer_class(issue, data=payload, partial=True)
        assert not serializer.is_valid()
        assert "Start date cannot exceed target date" in str(serializer.errors)

    @pytest.mark.parametrize("payload", [
        {"start_date": None},
        {"target_date": None},
        {"start_date": "2026-10-20"},
        {"target_date": "2026-10-10"},
        {"start_date": "2026-10-01", "target_date": "2026-10-02"},
    ])
    def test_allows_clearing_dates_equal_dates_and_valid_ranges(self, serializer_class, payload):
        issue = Issue(start_date=date(2026, 10, 10), target_date=date(2026, 10, 20))
        serializer = serializer_class(issue, data=payload, partial=True)
        assert serializer.is_valid(), serializer.errors


    def test_unrelated_edits_to_legacy_invalid_ranges_remain_possible(self, serializer_class):
        issue = Issue(start_date=date(2026, 10, 20), target_date=date(2026, 10, 10))
        serializer = serializer_class(issue, data={"name": "Corrected title"}, partial=True)
        assert serializer.is_valid(), serializer.errors
