import os
import uuid

from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

_ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
_ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


class WordImageUploadAPIView(APIView):
    """Accept a single image file and return a servable URL, for use as WordEntry/Recipe image_url."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        upload = request.FILES.get('image')
        if not upload:
            return Response(
                {'detail': 'No image file provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.content_type not in _ALLOWED_CONTENT_TYPES:
            return Response(
                {'detail': 'Unsupported image type. Use JPEG, PNG, WEBP, or GIF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext = os.path.splitext(upload.name)[1].lower()
        if ext not in _ALLOWED_EXTENSIONS:
            ext = '.jpg'

        filename = f'word_uploads/{uuid.uuid4().hex}{ext}'
        saved_path = default_storage.save(filename, upload)
        url = request.build_absolute_uri(default_storage.url(saved_path))

        return Response({'url': url}, status=status.HTTP_201_CREATED)
