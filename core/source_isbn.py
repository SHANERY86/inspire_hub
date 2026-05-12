"""ISBN normalization and Open Library metadata lookup."""

import re

import requests


def normalize_isbn(raw: str) -> str:
    """Strip to digits (and trailing X for ISBN-10). Empty if nothing usable."""
    if not raw or not str(raw).strip():
        return ''
    s = str(raw).strip().upper().replace(' ', '')
    s = re.sub(r'[^0-9X]', '', s)
    if len(s) == 10 and s[-1] == 'X':
        return s
    return re.sub(r'[^0-9]', '', s)


def _openlibrary_cover_url(row: dict, isbn_digits: str) -> str | None:
    """Best-effort cover URL from Open Library (served by covers.openlibrary.org)."""
    cid = row.get('cover_i')
    if isinstance(cid, int) and cid > 0:
        return f'https://covers.openlibrary.org/b/id/{cid}-L.jpg'
    cover = row.get('cover')
    if isinstance(cover, dict):
        for k in ('large', 'medium', 'small'):
            u = cover.get(k)
            if isinstance(u, str) and u.startswith('http'):
                return u
    if len(isbn_digits) in (10, 13):
        return f'https://covers.openlibrary.org/b/isbn/{isbn_digits}-L.jpg'
    return None


def openlibrary_lookup_isbn(isbn_digits: str) -> dict | None:
    """
    Return title, authors, publish_date, openlibrary_url, cover_url (may be None).

    Uses https://openlibrary.org/dev/docs/api/books (no API key).
    """
    key = f'ISBN:{isbn_digits}'
    url = 'https://openlibrary.org/api/books'
    r = requests.get(
        url,
        params={'bibkeys': key, 'format': 'json', 'jscmd': 'data'},
        timeout=12,
    )
    r.raise_for_status()
    data = r.json()
    row = data.get(key)
    if not row:
        return None
    authors = []
    for a in row.get('authors', []) or []:
        name = a.get('name')
        if name:
            authors.append(name)
    title = (row.get('title') or '').strip()
    if not title:
        return None
    cover_url = _openlibrary_cover_url(row, isbn_digits)
    return {
        'title': title,
        'authors': authors,
        'publish_date': row.get('publish_date') or '',
        'openlibrary_url': row.get('info_url') or row.get('url') or '',
        'cover_url': cover_url,
    }
