import base64
import io
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status

from core.models import Inspiration, Screenshot


def _tiny_jpeg_upload(name='test.jpg'):
    buf = io.BytesIO()
    Image.new('RGB', (1, 1), color=(255, 0, 0)).save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')


def _tiny_jpeg_b64():
    buf = io.BytesIO()
    Image.new('RGB', (1, 1), color=(0, 255, 0)).save(buf, format='JPEG')
    return base64.b64encode(buf.getvalue()).decode('utf-8')


@pytest.mark.django_db
class TestInspirationDraftPreview:
    @patch('core.draft_views.extract_text_from_upload', return_value='mocked ocr')
    def test_preview_multipart_returns_form_and_screenshots(self, _mock, authenticated_api_client):
        img = _tiny_jpeg_upload('page.jpg')
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/preview/',
            {
                'source_title': 'T',
                'essence': 'E',
                'user_thoughts': '',
                'source_type': 'book',
                'reference': '',
                'screenshots': img,
            },
            format='multipart',
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['form_data']['source_title'] == 'T'
        assert len(r.data['screenshots']) == 1
        assert r.data['screenshots'][0]['filename'] == 'page.jpg'
        assert r.data['screenshots'][0]['extracted_text'] == 'mocked ocr'
        assert r.data['screenshots'][0]['image_base64']

    def test_preview_requires_screenshots_or_thoughts(self, authenticated_api_client):
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/preview/',
            {
                'source_title': 'T',
                'essence': 'E',
                'user_thoughts': '   ',
                'source_type': 'book',
                'reference': '',
            },
            format='multipart',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    @patch('core.draft_views.extract_text_from_upload', return_value='x')
    def test_preview_accepts_user_thoughts_only(self, _mock, authenticated_api_client):
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/preview/',
            {
                'source_title': 'T',
                'essence': 'E',
                'user_thoughts': 'my idea',
                'source_type': 'book',
                'reference': '',
            },
            format='multipart',
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['screenshots'] == []

    def test_preview_unauthenticated(self, api_client):
        r = api_client.post(
            '/api/v1/inspiration-drafts/preview/',
            {'user_thoughts': 'x'},
            format='multipart',
        )
        assert r.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestInspirationDraftCommit:
    def test_commit_creates_inspiration_and_screenshot(self, authenticated_api_client):
        b64 = _tiny_jpeg_b64()
        payload = {
            'source_title': 'Book',
            'essence': 'Core idea',
            'user_thoughts': '',
            'source_type': 'book',
            'reference': '',
            'screenshots': [
                {
                    'keep': True,
                    'image_base64': b64,
                    'filename': 'snap.jpg',
                    'extracted_text': 'Quoted line',
                }
            ],
        }
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            payload,
            format='json',
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data['source_title'] == 'Book'
        assert r.data['quote'] == 'Quoted line'
        assert Inspiration.objects.count() == 1
        assert Screenshot.objects.count() == 1

    def test_commit_skips_not_kept(self, authenticated_api_client):
        b64 = _tiny_jpeg_b64()
        payload = {
            'source_title': 'B',
            'essence': 'E',
            'user_thoughts': '',
            'source_type': 'book',
            'reference': '',
            'screenshots': [
                {
                    'keep': False,
                    'image_base64': b64,
                    'filename': 'x.jpg',
                    'extracted_text': 'only in quote',
                }
            ],
        }
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            payload,
            format='json',
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data['quote'] == 'only in quote'
        assert Screenshot.objects.count() == 0

    def test_commit_requires_core_fields(self, authenticated_api_client):
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            {'source_title': '', 'essence': 'E', 'source_type': 'book', 'screenshots': []},
            format='json',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_commit_unauthenticated(self, api_client):
        r = api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            {
                'source_title': 'B',
                'essence': 'E',
                'source_type': 'book',
                'screenshots': [],
            },
            format='json',
        )
        assert r.status_code == status.HTTP_403_FORBIDDEN
