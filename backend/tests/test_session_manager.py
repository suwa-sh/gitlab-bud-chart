"""SessionManager の永続化のテスト

セッションファイルは GitLab トークンを含むため、保存先と権限を固定する。
"""

import json
import os
import stat
from pathlib import Path

from app.services import session_manager as session_manager_module
from app.services.session_manager import SessionManager


def file_mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


def test_default_path_is_not_in_shared_tmp(monkeypatch):
    monkeypatch.delenv("SESSION_FILE", raising=False)

    path = session_manager_module._default_persistence_file()

    assert not path.startswith("/tmp")
    assert path.startswith(os.path.expanduser("~"))


def test_default_path_can_be_overridden_by_env(monkeypatch, tmp_path: Path):
    target = tmp_path / "custom.json"
    monkeypatch.setenv("SESSION_FILE", str(target))

    assert session_manager_module._default_persistence_file() == str(target)


def test_session_file_is_readable_only_by_owner(tmp_path: Path):
    target = tmp_path / "state" / "sessions.json"
    manager = SessionManager(persistence_file=str(target))

    manager.create_session()

    assert file_mode(target) == 0o600
    assert file_mode(target.parent) == 0o700


def test_existing_loose_permissions_are_tightened_on_save(tmp_path: Path):
    target = tmp_path / "sessions.json"
    target.write_text("{}")
    target.chmod(0o644)
    manager = SessionManager(persistence_file=str(target))

    manager.create_session()

    assert file_mode(target) == 0o600


def test_sessions_survive_restart(tmp_path: Path):
    target = tmp_path / "sessions.json"
    session_id = SessionManager(persistence_file=str(target)).create_session()

    restored = SessionManager(persistence_file=str(target))

    assert session_id in json.loads(target.read_text())
    assert restored.get_gitlab_client(session_id) is not None


def test_deleted_session_is_removed_from_file(tmp_path: Path):
    target = tmp_path / "sessions.json"
    manager = SessionManager(persistence_file=str(target))
    session_id = manager.create_session()

    assert manager.delete_session(session_id) is True

    assert session_id not in json.loads(target.read_text())
    assert manager.get_gitlab_client(session_id) is None
