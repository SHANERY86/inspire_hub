"""Pytest hooks: remove screenshot upload files so they do not accumulate."""

from __future__ import annotations

import shutil
from pathlib import Path

_TINY_IMAGE_MAX_BYTES = 60_000
_TINY_IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}


def _clear_dir_contents(path: Path) -> None:
    if not path.is_dir():
        return
    for child in path.iterdir():
        try:
            if child.is_file():
                child.unlink()
            elif child.is_dir():
                shutil.rmtree(child, ignore_errors=True)
        except OSError:
            pass


def _clear_tiny_images_only(path: Path) -> None:
    """Remove only small image files (typical API test JPEGs), not large user screenshots."""
    if not path.is_dir():
        return
    for f in path.iterdir():
        if not f.is_file():
            continue
        if f.suffix.lower() not in _TINY_IMAGE_SUFFIXES:
            continue
        try:
            if f.stat().st_size <= _TINY_IMAGE_MAX_BYTES:
                f.unlink()
        except OSError:
            pass


def _cleanup_all_upload_dirs() -> None:
    try:
        from django.conf import settings
    except Exception:
        return

    test_root = Path(settings.MEDIA_ROOT)
    _clear_dir_contents(test_root / 'screenshots')
    # Legacy location when tests used the same MEDIA_ROOT as dev settings.
    legacy = Path(settings.BASE_DIR) / 'media' / 'screenshots'
    _clear_tiny_images_only(legacy)


def pytest_sessionstart(session) -> None:
    _cleanup_all_upload_dirs()


def pytest_sessionfinish(session, exitstatus) -> None:
    _cleanup_all_upload_dirs()
