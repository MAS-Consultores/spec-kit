# Upstream upgrade

Repeat this procedure when GitHub publishes a newer spec-kit release. The MAS
layer is the set of files that exist only on this fork, plus the small hooks in
`src/specify_cli/command_init.py`.

## Preconditions

- Work on a branch other than `main`. The last known-good fork commit before
  the v1.2.2 merge is tag `mas-pre-v1.2.2`.
- `upstream` remote: `https://github.com/github/spec-kit.git`.
- Python 3.11+ via `uv` (`uv python install 3.12` if the machine has no Python).

## Steps

1. Fetch the release tag:

   ```bash
   git fetch upstream --tags
   ```

2. Merge the tag into the update branch:

   ```bash
   git merge vX.Y.Z
   ```

3. Resolve the expected conflicts:

   - `pyproject.toml`: keep upstream dependencies, scripts, and bundled asset
     maps, and keep the `presets/mas-*` force-include entries. Set
     `version` to `X.Y.Z+mas.1`.
   - `src/specify_cli/command_init.py` (or `__init__.py` if upstream moves init
     again): keep the upstream command and reattach the MAS calls
     `require_mas_stack`, `init_options_payload`, `apply_mas_project_layer`,
     `finalize_mas_memory`, and `print_external_skills_report`.

4. Re-check the MAS layer against the new upstream APIs:

   - `presets/mas-core/preset.yml` strategies (`wrap`, `append`, `replace`)
     still match the preset manifest.
   - `stack_skills.py` agent map only lists integrations that still exist.
   - New artifact-writing commands get a `strategy: wrap` entry in `mas-core`
     when they should follow the language policy.
   - `requires.speckit_version` on MAS presets matches the new baseline.

The upstream test suite sets `SPECIFY_ALLOW_STACKLESS=1` from `tests/conftest.py`.
That variable is maintainer-only. Do not set it in delivery projects.

5. Run the MAS tests, then the full suite:

   ```bash
   uv sync --extra test
   uv run pytest tests/test_mas_stack_init.py tests/test_stack_external_skills.py
   uv run pytest
   ```

6. Initialize one project per stack and confirm `.specify/presets/`,
   `constitution.md`, stack memory, and `init-options.json`.

7. Open a pull request into `main` and tag `vX.Y.Z-mas.1`.
