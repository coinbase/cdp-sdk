"""Tests for generate_public_operations.py."""

import re
import textwrap
from pathlib import Path

from generate_public_operations import (
    PublicOperation,
    is_public_security,
    load_public_operations,
    render_go,
    render_python,
    render_typescript,
)

FIXTURE_SPEC = textwrap.dedent(
    """
    openapi: 3.1.0
    info:
      title: Fixture API
      version: 1.0.0
    security:
      - apiKeyAuth: []
    paths:
      /v1/authed-by-default:
        get:
          operationId: authedByDefault
      /v1/explicitly-unauthenticated:
        get:
          operationId: explicitlyUnauthenticated
          security:
            - unauthenticated: []
      /v1/no-security-requirement:
        post:
          operationId: noSecurityRequirement
          security: []
      /v1/either-authed-or-not:
        get:
          operationId: eitherAuthedOrNot
          security:
            - apiKeyAuth: []
            - unauthenticated: []
      /v1/still-authed-override:
        get:
          operationId: stillAuthedOverride
          security:
            - endUserAuth: []
      /v1/resources/{id}:
        get:
          operationId: getResourceById
          security:
            - unauthenticated: []
    """
)


def test_is_public_security_empty_list_is_public():
    """An empty `security` list means no auth is required at all."""
    assert is_public_security([]) is True


def test_is_public_security_unauthenticated_alternative_is_public():
    """An `unauthenticated` alternative anywhere in `security` makes the operation public."""
    assert is_public_security([{"apiKeyAuth": []}, {"unauthenticated": []}]) is True
    assert is_public_security([{"unauthenticated": []}]) is True


def test_is_public_security_apikey_only_is_not_public():
    """An operation requiring only `apiKeyAuth` is not public."""
    assert is_public_security([{"apiKeyAuth": []}]) is False


def test_load_public_operations_resolves_operation_and_default_security(tmp_path: Path):
    """Public operations are resolved from both operation-level and document-default security."""
    spec_path = tmp_path / "openapi.yaml"
    spec_path.write_text(FIXTURE_SPEC)

    operations = load_public_operations(spec_path)
    operation_keys = {(op.method, op.path) for op in operations}

    assert operation_keys == {
        ("GET", "/v1/explicitly-unauthenticated"),
        ("POST", "/v1/no-security-requirement"),
        ("GET", "/v1/either-authed-or-not"),
        ("GET", "/v1/resources/{id}"),
    }
    # Operations that default to (or explicitly require) an authenticated scheme are excluded.
    assert ("GET", "/v1/authed-by-default") not in operation_keys
    assert ("GET", "/v1/still-authed-override") not in operation_keys


def test_path_regex_source_matches_templated_path_params():
    """Templated path params (e.g. `{id}`) match a single non-slash path segment."""
    op = PublicOperation(method="GET", path="/v1/resources/{id}")
    pattern = op.path_regex_source

    compiled = re.compile(pattern)
    # Anchored only at the end, so a base-path prefix (e.g. "/platform") is tolerated.
    assert compiled.search("/v1/resources/abc-123")
    assert compiled.search("/platform/v1/resources/abc-123")
    assert not compiled.search("/v1/resources/abc-123/extra")
    assert not compiled.search("/v1/resources/")


def test_path_regex_source_tolerates_base_path_prefix():
    """The generated pattern matches regardless of a mounted base-path prefix."""
    op = PublicOperation(method="GET", path="/v2/x402/discovery/search")
    pattern = op.path_regex_source

    compiled = re.compile(pattern)
    assert compiled.search("/v2/x402/discovery/search")
    assert compiled.search("/platform/v2/x402/discovery/search")
    assert not compiled.search("/v2/x402/discovery/searchable")


def test_render_typescript_produces_valid_regex_construction():
    """The TypeScript renderer emits a `new RegExp(...)` call, not a bare `/.../ ` literal."""
    operations = [PublicOperation(method="GET", path="/v2/x402/discovery/search")]
    output = render_typescript(operations)

    assert 'new RegExp("/v2/x402/discovery/search$")' in output
    assert "export function isPublicOperation" in output


def test_render_python_produces_compilable_pattern():
    """The Python renderer emits a compilable pattern and uses `.search`, not `.match`."""
    operations = [PublicOperation(method="GET", path="/v2/x402/discovery/search")]
    output = render_python(operations)

    assert 're.compile(r"/v2/x402/discovery/search$")' in output
    assert "def is_public_operation" in output
    assert "path_pattern.search(path)" in output


def test_render_go_produces_valid_regexp_construction():
    """The Go renderer emits a valid `regexp.MustCompile` call."""
    operations = [PublicOperation(method="GET", path="/v2/x402/discovery/search")]
    output = render_go(operations)

    assert "regexp.MustCompile(`/v2/x402/discovery/search$`)" in output
    assert "func IsPublicOperation" in output
