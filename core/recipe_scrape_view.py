import logging

import requests
from recipe_scrapers import scrape_html
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0 Safari/537.36'
    )
}


class RecipeScrapeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        url = (request.data.get('url') or '').strip()
        if not url:
            return Response(
                {'detail': 'url is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resp = requests.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
            resp.raise_for_status()
        except requests.exceptions.RequestException as exc:
            logger.error('Recipe fetch error for %s: %s', url, exc)
            return Response(
                {'detail': 'Could not fetch that URL. Check the address and try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            scraper = scrape_html(resp.text, org_url=url, wild_mode=True)
        except Exception as exc:
            logger.warning('Recipe scrape parse error for %s: %s', url, exc)
            return Response(
                {'detail': 'Could not extract recipe data from that page. Try a different URL or paste ingredients manually.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        def safe(fn):
            try:
                return fn() or None
            except Exception:
                return None

        title = safe(scraper.title) or ''
        ingredients = safe(scraper.ingredients) or []
        image_url = safe(scraper.image) or ''
        instructions_list = safe(scraper.instructions_list) or []
        if not instructions_list:
            raw = safe(scraper.instructions) or ''
            instructions_list = [s.strip() for s in raw.split('\n') if s.strip()] if raw else []

        if not title and not ingredients:
            return Response(
                {'detail': 'No recipe data found on that page. The site may block scraping or not use standard recipe markup. Try pasting the URL of an individual recipe (not a category page).'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        return Response({
            'title': title,
            'ingredients': ingredients,
            'instructions': instructions_list,
            'image_url': image_url,
        })
