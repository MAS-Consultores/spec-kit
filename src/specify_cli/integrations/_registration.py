"""Pin project-local implementations throughout command and skill rendering."""

from __future__ import annotations

import inspect
from functools import wraps


def project_registration(handler):
    signature = inspect.signature(handler)

    @wraps(handler)
    def invoke(*args, **kwargs):
        from .installer import project_integrations

        values = signature.bind(*args, **kwargs).arguments
        root = (
            values["project_root"] if "project_root" in signature.parameters
            else values["self"].project_root
        )
        with project_integrations(root):
            return handler(*args, **kwargs)

    return invoke


def refresh_manifest_hashes(handler):
    """Track successful preset writes without adopting pre-existing user edits."""
    @wraps(handler)
    def invoke(self, *args, **kwargs):
        from ..integration_state import installed_integration_keys, try_read_integration_json
        from ._helpers import _snapshot_manifest_before_registration, _resync_manifest_after_registration

        state, _ = try_read_integration_json(self.project_root)
        snapshots = {
            key: _snapshot_manifest_before_registration(self.project_root, key)
            for key in installed_integration_keys(state or {})
        }
        result = handler(self, *args, **kwargs)
        for key, (manifest, unmodified) in snapshots.items():
            if manifest is not None:
                _resync_manifest_after_registration(
                    manifest, key, unmodified_files=unmodified,
                    continuing="Preset operation completed; manifest hashes may need manual refresh.",
                )
        return result

    return invoke
