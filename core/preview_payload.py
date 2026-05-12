"""Shared validation for draft preview/commit payloads (HTML flow removed; API still uses this)."""


def preview_session_valid(form_data, screenshot_data):
    """Return True if payload is usable for preview/save."""
    if not isinstance(form_data, dict) or not form_data:
        return False
    required = ('source_title', 'essence', 'source_type')
    if not all(str(form_data.get(k) or '').strip() for k in required):
        return False
    if screenshot_data is not None and not isinstance(screenshot_data, list):
        return False
    return True
