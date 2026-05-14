import requests
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .source_isbn import normalize_isbn, openlibrary_lookup_isbn


class SourceISBNLookupAPIView(APIView):
    """
    GET ?isbn=... — returns Open Library metadata for a 10- or 13-digit ISBN.

    JSON includes cover_url when we can derive one (Open Library CDN); may still 404
    in the browser if no art exists for that ISBN.

    Used to pre-fill a new source; does not create a row.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw = (request.query_params.get('isbn') or '').strip()
        if not raw:
            return Response(
                {'detail': 'Query parameter isbn is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        digits = normalize_isbn(raw)
        if len(digits) not in (10, 13):
            return Response(
                {'detail': 'ISBN must be 10 or 13 characters (digits, or X for ISBN-10).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            meta = openlibrary_lookup_isbn(digits)
        except requests.exceptions.RequestException:
            return Response(
                {'detail': 'Lookup service unavailable. Try again later.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if not meta:
            return Response(
                {'detail': 'No match found for that ISBN.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(meta)
