import logging

import requests
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'
HEADERS = {'User-Agent': 'InspireHub/1.0 (shanery86@gmail.com)'}

_SKIP_MIMES = {'image/x-png'}
_SKIP_WORDS = {'icon', 'logo', 'button', 'commons-logo', 'wikimedia', 'edit', 'question_book', 'portal', 'sound', 'audio', 'flag of', 'flag_of'}


def _is_useful_image(title, mime):
    if mime in _SKIP_MIMES:
        return False
    lower = title.lower()
    return not any(w in lower for w in _SKIP_WORDS)


def _fetch_article_images(q):
    """Return image dicts from the Wikipedia article whose title best matches q."""
    try:
        resp = requests.get(
            WIKIPEDIA_API,
            params={
                'action': 'query',
                'titles': q,
                'generator': 'images',
                'gimlimit': 50,
                'prop': 'imageinfo',
                'iiprop': 'url|mime',
                'iiurlwidth': 500,
                'format': 'json',
            },
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        pages = resp.json().get('query', {}).get('pages', {})
        images = []
        for page in pages.values():
            info_list = page.get('imageinfo', [])
            if not info_list:
                continue
            info = info_list[0]
            url = info.get('thumburl', '') or info.get('url', '')
            mime = info.get('mime', '')
            title = page.get('title', '')
            if url and _is_useful_image(title, mime):
                images.append({'url': url, 'thumbnail': url, 'title': title.replace('File:', '')})
        return images
    except Exception as exc:
        logger.warning('Article image fetch failed for %r: %s', q, exc)
        return []


def _fetch_search_images(q):
    """Return thumbnail dicts from the top Wikipedia search results for q."""
    try:
        resp = requests.get(
            WIKIPEDIA_API,
            params={
                'action': 'query',
                'generator': 'search',
                'gsrsearch': q,
                'gsrlimit': 10,
                'prop': 'pageimages',
                'pithumbsize': 500,
                'pilimit': 10,
                'format': 'json',
            },
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        pages = resp.json().get('query', {}).get('pages', {})
        images = []
        for page in sorted(pages.values(), key=lambda p: p.get('index', 999)):
            thumb = page.get('thumbnail', {})
            url = thumb.get('source', '')
            if url:
                images.append({'url': url, 'thumbnail': url, 'title': page.get('title', '')})
        return images
    except Exception as exc:
        logger.warning('Search image fetch failed for %r: %s', q, exc)
        return []


class WordImageSearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if not q:
            return Response(
                {'detail': 'Query parameter "q" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        article_images = _fetch_article_images(q)
        search_images = _fetch_search_images(q)

        # Merge: article images first, then search results, deduplicating by URL
        seen = set()
        merged = []
        for img in article_images + search_images:
            if img['url'] not in seen:
                seen.add(img['url'])
                merged.append(img)

        if not merged:
            return Response(
                {'detail': 'No images found for that search.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({'images': merged})
