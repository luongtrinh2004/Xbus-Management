import pytest

from plane.utils.issue_dependencies import dependency_edge, find_dependency_cycle


@pytest.mark.unit
class TestIssueDependencyGraph:
    def test_normalizes_persisted_dependency_directions(self):
        assert dependency_edge("blocked_by", "dependent", "blocker") == ("blocker", "dependent")
        assert dependency_edge("start_before", "before", "after") == ("before", "after")
        assert dependency_edge("finish_before", "before", "after") == ("before", "after")
        assert dependency_edge("relates_to", "a", "b") is None

    def test_rejects_self_direct_and_transitive_cycles(self):
        assert find_dependency_cycle([], [("blocked_by", "a", "a")]) == ("a", "a")
        existing = [("blocked_by", "b", "a"), ("blocked_by", "c", "b")]
        assert find_dependency_cycle(existing, [("blocked_by", "a", "b")]) == ("b", "a")
        assert find_dependency_cycle(existing, [("blocked_by", "a", "c")]) == ("c", "a")

    def test_checks_all_proposed_edges_together_and_all_temporal_types(self):
        proposed = [("start_before", "a", "b"), ("finish_before", "b", "c"), ("blocked_by", "a", "c")]
        assert find_dependency_cycle([], proposed) == ("c", "a")

    def test_allows_acyclic_cross_project_graphs_and_duplicate_retries(self):
        existing = [("blocked_by", "b", "a"), ("blocked_by", "c", "a")]
        assert find_dependency_cycle(existing, [("blocked_by", "b", "a")]) is None
        assert find_dependency_cycle(existing, [("blocked_by", "d", "b"), ("blocked_by", "d", "c")]) is None

    def test_legacy_cycle_does_not_loop_or_block_unrelated_edits(self):
        existing = [("blocked_by", "b", "a"), ("blocked_by", "a", "b")]
        assert find_dependency_cycle(existing, [("blocked_by", "d", "c")]) is None
