# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

"""Dependency graph validation shared by relation writers."""

DEPENDENCY_RELATIONS = frozenset({"blocked_by", "start_before", "finish_before"})


def dependency_edge(relation_type, issue_id, related_issue_id):
    """Normalize persisted relations to prerequisite -> dependent edges."""
    source, target = str(issue_id), str(related_issue_id)
    if relation_type == "blocked_by":
        return target, source
    if relation_type in {"start_before", "finish_before"}:
        return source, target
    return None


def find_dependency_cycle(existing_relations, proposed_relations):
    """Return the first new edge that closes a cycle, without rejecting idempotent retries.

    Relations are ``(stored_type, issue_id, related_issue_id)`` triples. All
    proposed edges are checked together, so a batch cannot introduce a cycle
    that would be missed by checking each edge against only persisted data.
    """
    adjacency = {}
    edges = set()
    for relation in existing_relations:
        edge = dependency_edge(*relation)
        if edge:
            edges.add(edge)
            adjacency.setdefault(edge[0], set()).add(edge[1])

    for relation in proposed_relations:
        edge = dependency_edge(*relation)
        if edge is None or edge in edges:
            continue
        source, target = edge
        pending, visited = [target], set()
        while pending:
            node = pending.pop()
            if node == source:
                return edge
            if node in visited:
                continue
            visited.add(node)
            pending.extend(adjacency.get(node, ()))
        edges.add(edge)
        adjacency.setdefault(source, set()).add(target)

    return None
