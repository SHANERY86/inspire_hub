"""Inspiration REST helpers: multipart OCR preview, then JSON commit (SPA two-step flow)."""
from django.db import DatabaseError
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .inspiration_commit import commit_inspiration_with_screenshots
from .ocr_service import extract_text_from_upload, uploaded_file_to_base64
from .preview_payload import preview_session_valid
from .serializers import InspirationDraftCommitSerializer


class InspirationDraftPreviewAPIView(APIView):
    """
    POST multipart: same fields as the step-1 inspiration form — form fields + screenshots[] files.
    Returns JSON { form_data, screenshots } for client-side preview (no server-side session payload).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        form_data = {
            'source_title': request.POST.get('source_title', ''),
            'essence': request.POST.get('essence', ''),
            'user_thoughts': request.POST.get('user_thoughts', ''),
            'source_type': request.POST.get('source_type', ''),
            'reference': request.POST.get('reference', ''),
        }
        screenshots = request.FILES.getlist('screenshots')

        if not screenshots and not (form_data['user_thoughts'] or '').strip():
            return Response(
                {
                    'detail': 'Please either upload at least one screenshot or enter your thoughts.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        screenshot_data = []
        for uploaded_file in screenshots:
            extracted_text = extract_text_from_upload(uploaded_file)
            image_base64 = uploaded_file_to_base64(uploaded_file)
            screenshot_data.append(
                {
                    'image_base64': image_base64,
                    'filename': uploaded_file.name,
                    'extracted_text': extracted_text,
                }
            )

        return Response(
            {
                'form_data': form_data,
                'screenshots': screenshot_data,
            }
        )


class InspirationDraftCommitAPIView(APIView):
    """
    POST JSON: edited form_data + screenshots with keep / extracted_text / image_base64.
    Validates required inspiration fields, then persists via commit_inspiration_with_screenshots.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        ser = InspirationDraftCommitSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        payload = ser.validated_data
        form_data = {
            'source_title': payload['source_title'],
            'essence': payload['essence'],
            'user_thoughts': payload.get('user_thoughts') or '',
            'source_type': payload['source_type'],
            'reference': payload.get('reference') or '',
        }
        screenshot_list = payload.get('screenshots') or []

        if not preview_session_valid(form_data, screenshot_list):
            return Response(
                {
                    'detail': 'Incomplete form data. source_title, essence, and source_type are required.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        screenshot_rows = [
            {
                'keep': item.get('keep', False),
                'extracted_text': item.get('extracted_text') or '',
                'image_base64': item.get('image_base64'),
                'filename': item.get('filename') or None,
            }
            for item in screenshot_list
        ]

        try:
            inspiration = commit_inspiration_with_screenshots(
                form_data,
                screenshot_rows,
                user=request.user,
                on_warning=None,
            )
        except DatabaseError:
            return Response(
                {'detail': 'Could not save your inspiration. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                'id': inspiration.id,
                'user': inspiration.user_id,
                'source_title': inspiration.source_title,
                'essence': inspiration.essence,
                'date': inspiration.date,
                'quote': inspiration.quote,
                'user_thoughts': inspiration.user_thoughts,
                'source_type': inspiration.source_type,
                'reference': inspiration.reference,
            },
            status=status.HTTP_201_CREATED,
        )
