import requests
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en'


class DictionaryLookupAPIView(APIView):
    """
    GET ?word=... — looks up a word using the Free Dictionary API and returns
    a flat list of definitions, each with its part of speech, so the user can
    pick one to save.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        word = (request.query_params.get('word') or '').strip().lower()
        if not word:
            return Response(
                {'detail': 'Query parameter "word" is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resp = requests.get(
                f'{DICTIONARY_API_URL}/{word}',
                timeout=8,
            )
        except requests.exceptions.RequestException:
            return Response(
                {'detail': 'Dictionary service unavailable. Try again later.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code == 404:
            return Response(
                {'detail': f'No definitions found for "{word}".'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not resp.ok:
            return Response(
                {'detail': 'Dictionary lookup failed.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            entries = resp.json()
        except ValueError:
            return Response(
                {'detail': 'Unexpected response from dictionary service.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        definitions = []
        for entry in entries:
            phonetic = entry.get('phonetic', '')
            for meaning in entry.get('meanings', []):
                pos = meaning.get('partOfSpeech', '')
                for defn in meaning.get('definitions', []):
                    definitions.append({
                        'definition': defn.get('definition', ''),
                        'part_of_speech': pos,
                        'example': defn.get('example', ''),
                        'phonetic': phonetic,
                    })

        return Response({
            'word': word,
            'definitions': definitions,
        })
