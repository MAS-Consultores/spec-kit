"""Windows atomic writes keep the previous file when replace fails.

Upstream v1.4.4 publishes through a staging file and checks the destination
once before ``os.replace``. A sharing violation is not retried: the original
file stays, and the staging file is removed.
"""

import os

import pytest

from specify_cli.file_helper import FileHelper, FileHelperError

pytestmark = pytest.mark.skipif(os.name != "nt", reason="Windows sharing violations")


def locked_error():
    error = PermissionError("temporarily locked")
    error.winerror = 32
    return error


def test_atomic_replace_failure_keeps_the_previous_file(tmp_path, monkeypatch):
    destination = tmp_path / "owned.txt"
    destination.write_text("old")
    calls = []

    def locked_replace(source, target, *args, **kwargs):
        calls.append(target)
        raise locked_error()

    monkeypatch.setattr("specify_cli.file_helper.os.replace", locked_replace)
    with pytest.raises(PermissionError):
        FileHelper(tmp_path).write_text("owned.txt", "new")
    assert len(calls) == 1
    assert destination.read_text() == "old"
    assert list(tmp_path.iterdir()) == [destination]


def test_replace_revalidates_path_before_replacing(tmp_path, monkeypatch):
    destination = tmp_path / "owned.txt"
    destination.write_text("old")
    original_path = FileHelper._path
    seen = {"count": 0}

    def change_before_publish(self, path, **kwargs):
        seen["count"] += 1
        if seen["count"] > 1:
            raise FileHelperError("destination changed")
        return original_path(self, path, **kwargs)

    def lock(source, target, *args, **kwargs):
        raise AssertionError("must not replace after the destination changes")

    monkeypatch.setattr(FileHelper, "_path", change_before_publish)
    monkeypatch.setattr("specify_cli.file_helper.os.replace", lock)
    with pytest.raises(FileHelperError, match="destination changed"):
        FileHelper(tmp_path).write_text("owned.txt", "new")
    assert destination.read_text() == "old"
    assert list(tmp_path.iterdir()) == [destination]
