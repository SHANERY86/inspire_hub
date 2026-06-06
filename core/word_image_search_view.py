import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1'


class WordImageSearchAPIView(APIView):
    """
    GET ?q=<term> — proxies Google Custom Search JSON API (image search).
    Returns a list of { url, thumbnail, title } objects.
    Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX in settings/env.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if not q:
            return Response(
                {'detail': 'Query parameter "q" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, 'GOOGLE_SEARCH_API_KEY', '')
        cx = getattr(settings, 'GOOGLE_SEARCH_CX', '')

        if not api_key or not cx:
            return Response(
                {'detail': 'Image search is not configured on this server.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            resp = requests.get(
                GOOGLE_SEARCH_URL,
                params={
                    'key': api_key,
                    'cx': cx,
                    'searchType': 'image',
                    'q': q,
                    'num': 10,
                    'safe': 'active',
                },
                timeout=10,
            )
        except requests.exceptions.RequestException:
            return Response(
                {'detail': 'Image search service unavailable. Try again later.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code == 429:
            return Response(
                {'detail': 'Image search quota exceeded for today.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not resp.ok:
            return Response(
                {'detail': f'Image search failed ({resp.status_code}).'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            data = resp.json()
        except ValueError:
            return Response(
                {'detail': 'Unexpected response from image search service.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        images = []
        for item in data.get('items') or []:
            images.append({
                'url': item.get('link', ''),
                'thumbnail': item.get('image', {}).get('thumbnailLink', ''),
                'title': item.get('title', ''),
            })

        return Response({'images': images})
