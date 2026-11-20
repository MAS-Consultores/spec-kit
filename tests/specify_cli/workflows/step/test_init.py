"""MAS workflow initialization contracts."""

import json

import pytest

from specify_cli.workflows.base import StepContext, StepStatus
from specify_cli.workflows.step.init import InitStep


@pytest.mark.parametrize("stack", [None, "unknown-stack"])
def test_missing_or_invalid_stack_fails_before_creating_project(tmp_path, stack):
    target = tmp_path / "project"
    config = {"id": "init", "project": str(target), "stack": stack,
              "skip_external_skills": True, "script": "py"}
    result = InitStep().execute(config, StepContext(project_root=str(tmp_path)))
    assert result.status == StepStatus.FAILED
    assert "stack" in result.error.lower()
    assert not target.exists()


def test_explicit_stack_expression_initializes_offline(tmp_path):
    target = tmp_path / "project"
    result = InitStep().execute(
        {"id": "init", "project": str(target), "stack": "{{ inputs.stack }}",
         "skip_external_skills": "{{ inputs.offline }}", "script": "py"},
        StepContext(project_root=str(tmp_path), inputs={"stack": "nestjs-react", "offline": True}),
    )
    assert result.status == StepStatus.COMPLETED, result.error
    assert result.output["stack"] == "nestjs-react"
    assert "--skip-external-skills" in result.output["argv"]
    assert "--non-interactive" in result.output["argv"]
    metadata = json.loads((target / ".specify/init-options.json").read_text())
    assert metadata["stack"] == "nestjs-react"


def test_external_skill_skip_is_explicit(tmp_path, monkeypatch):
    def capture(argv, context):
        assert "--stack" in argv
        assert "--skip-external-skills" not in argv
        return 0, "", ""
    monkeypatch.setattr(InitStep, "_run_init", staticmethod(capture))
    result = InitStep().execute(
        {"id": "init", "project": "project", "stack": "nestjs-react"},
        StepContext(project_root=str(tmp_path)),
    )
    assert result.status == StepStatus.COMPLETED
