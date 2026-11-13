"""Bounded Windows replacement retries preserve failures and path checks."""

import os

import pytest

from specify_cli.file_helper import FileHelper, FileHelperError

pytestmark = pytest.mark.skipif(os.name != "nt", reason="Windows sharing violations")


def locked_error():
    error = PermissionError("temporarily locked")
    error.winerror = 32
    return error


@pytest.mark.parametrize("persistent", [False, True])
def test_atomic_replace_retries_only_bounded_transient_failures(tmp_path, monkeypatch, persistent):
    destination = tmp_path / "owned.txt"
    destination.write_text("old")
    replace = os.replace
    calls = []

    def locked_then_replace(source, target):
        calls.append(target)
        if persistent or len(calls) == 1:
            raise locked_error()
        return replace(source, target)

    monkeypatch.setattr("specify_cli.file_helper.os.replace", locked_then_replace)
    monkeypatch.setattr("specify_cli.file_helper.time.sleep", lambda delay: None)
    if persistent:
        with pytest.raises(PermissionError):
            FileHelper(tmp_path).write_text("owned.txt", "new")
        assert len(calls) == 4
        assert destination.read_text() == "old"
    else:
        FileHelper(tmp_path).write_text("owned.txt", "new")
        assert len(calls) == 2
        assert destination.read_text() == "new"
    assert list(tmp_path.iterdir()) == [destination]


def test_retry_revalidates_path_before_replacing(tmp_path, monkeypatch):
    destination = tmp_path / "owned.txt"
    destination.write_text("old")
    original_path = FileHelper._path
    attempts = []

    def refuse_after_lock(self, path, **kwargs):
        if attempts:
            raise FileHelperError("destination changed")
        return original_path(self, path, **kwargs)

    def lock(source, target):
        attempts.append(target)
        raise locked_error()

    monkeypatch.setattr(FileHelper, "_path", refuse_after_lock)
    monkeypatch.setattr("specify_cli.file_helper.os.replace", lock)
    monkeypatch.setattr("specify_cli.file_helper.time.sleep", lambda delay: None)
    with pytest.raises(FileHelperError, match="destination changed"):
        FileHelper(tmp_path).write_text("owned.txt", "new")
    assert len(attempts) == 1
    assert destination.read_text() == "old"
    assert list(tmp_path.iterdir()) == [destination]
