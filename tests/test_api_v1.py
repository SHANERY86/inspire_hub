import base64
import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status

from core.models import Inspiration, Screenshot, Source


def _tiny_jpeg_upload(name='test.jpg'):
    buf = io.BytesIO()
    Image.new('RGB', (1, 1), color=(255, 0, 0)).save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')


def _tiny_jpeg_b64():
    buf = io.BytesIO()
    Image.new('RGB', (1, 1), color=(0, 0, 200)).save(buf, format='JPEG')
    return base64.b64encode(buf.getvalue()).decode('ascii')


@pytest.mark.django_db
class TestInspirationCRUD:
    def test_list_requires_auth(self, api_client):
        r = api_client.get('/api/v1/inspirations/')
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_list_empty(self, authenticated_api_client):
        r = authenticated_api_client.get('/api/v1/inspirations/')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 0
        assert r.data['results'] == []

    def test_list_filter_by_source(self, authenticated_api_client, api_user):
        src_a = Source.objects.create(user=api_user, title='Book A', source_type='book')
        src_b = Source.objects.create(user=api_user, title='Book B', source_type='book')
        Inspiration.objects.create(
            user=api_user,
            source=src_a,
            source_title='A',
            essence='One',
            source_type='book',
        )
        Inspiration.objects.create(
            user=api_user,
            source=src_b,
            source_title='B',
            essence='Two',
            source_type='book',
        )
        r = authenticated_api_client.get(
            '/api/v1/inspirations/', {'source': src_a.pk}
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 1
        assert r.data['results'][0]['essence'] == 'One'
        assert r.data['results'][0]['source'] == src_a.pk

    def test_create_and_retrieve(self, authenticated_api_client):
        payload = {
            'source_title': 'Test Book',
            'essence': 'A memorable line',
            'quote': 'Hello world',
            'user_thoughts': 'Nice',
            'source_type': 'book',
            'reference': 'p. 42',
        }
        r = authenticated_api_client.post('/api/v1/inspirations/', payload, format='json')
        assert r.status_code == status.HTTP_201_CREATED
        pk = r.data['id']

        r2 = authenticated_api_client.get(f'/api/v1/inspirations/{pk}/')
        assert r2.status_code == status.HTTP_200_OK
        assert r2.data['source_title'] == 'Test Book'
        assert r2.data['essence'] == 'A memorable line'
        assert r2.data.get('source') is None
        assert r2.data.get('source_display_title') == ''
        assert r2.data.get('source_display_author') == ''

    def test_retrieve_linked_source_display_fields(self, authenticated_api_client, api_user):
        src = Source.objects.create(
            user=api_user,
            title='Shelf work',
            author='Author Name',
            source_type='book',
        )
        payload = {
            'source_title': 'Any',
            'essence': 'Line',
            'quote': 'q',
            'user_thoughts': '',
            'source_type': 'book',
            'reference': '',
            'source': src.pk,
        }
        r = authenticated_api_client.post('/api/v1/inspirations/', payload, format='json')
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data['source_display_title'] == 'Shelf work'
        assert r.data['source_display_author'] == 'Author Name'

    def test_create_with_linked_source(self, authenticated_api_client, api_user):
        src = Source.objects.create(
            user=api_user,
            title='Saved work',
            source_type='book',
        )
        payload = {
            'source_title': 'Display title',
            'essence': 'Line',
            'quote': '',
            'user_thoughts': '',
            'source_type': 'book',
            'reference': '',
            'source': src.pk,
        }
        r = authenticated_api_client.post('/api/v1/inspirations/', payload, format='json')
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data['source'] == src.pk
        ins = Inspiration.objects.get(pk=r.data['id'])
        assert ins.source_id == src.pk

    def test_create_with_other_users_source_returns_400(
        self, authenticated_api_client, api_user, django_user_model
    ):
        other = django_user_model.objects.create_user(username='src_owner', password='pw')
        src = Source.objects.create(user=other, title='Theirs', source_type='book')
        payload = {
            'source_title': 'T',
            'essence': 'E',
            'source_type': 'book',
            'source': src.pk,
        }
        r = authenticated_api_client.post('/api/v1/inspirations/', payload, format='json')
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_and_delete(self, authenticated_api_client, api_user):
        ins = Inspiration.objects.create(
            user=api_user,
            source_title='Old',
            essence='Old essence',
            source_type='book',
        )
        r = authenticated_api_client.patch(
            f'/api/v1/inspirations/{ins.pk}/',
            {'essence': 'New essence'},
            format='json',
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['essence'] == 'New essence'

        r2 = authenticated_api_client.delete(f'/api/v1/inspirations/{ins.pk}/')
        assert r2.status_code == status.HTTP_204_NO_CONTENT
        assert not Inspiration.objects.filter(pk=ins.pk).exists()

    def test_create_missing_required_field_returns_400(self, authenticated_api_client):
        r = authenticated_api_client.post(
            '/api/v1/inspirations/',
            {'source_title': 'Only title', 'source_type': 'book'},
            format='json',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_create_returns_403(self, api_client):
        r = api_client.post(
            '/api/v1/inspirations/',
            {'source_title': 'Blocked', 'essence': 'No auth', 'source_type': 'book'},
            format='json',
        )
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_other_user_cannot_access_inspiration(self, authenticated_api_client, django_user_model):
        other = django_user_model.objects.create_user(
            username='other', password='pw'
        )
        ins = Inspiration.objects.create(
            user=other,
            source_title='Private',
            essence='X',
            source_type='book',
        )
        r = authenticated_api_client.get(f'/api/v1/inspirations/{ins.pk}/')
        assert r.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestScreenshotCRUD:
    def test_create_requires_image_and_inspiration(self, authenticated_api_client, api_user):
        ins = Inspiration.objects.create(
            user=api_user,
            source_title='S',
            essence='E',
            source_type='book',
        )
        img = _tiny_jpeg_upload()
        r = authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': img, 'extracted_text': 'ocr'},
            format='multipart',
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert Screenshot.objects.filter(inspiration=ins).count() == 1

    def test_create_missing_image_returns_400(self, authenticated_api_client, api_user):
        ins = Inspiration.objects.create(
            user=api_user,
            source_title='S',
            essence='E',
            source_type='book',
        )
        r = authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk},
            format='multipart',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_invalid_inspiration_returns_400(self, authenticated_api_client):
        r = authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': 999999, 'image': _tiny_jpeg_upload('invalid.jpg')},
            format='multipart',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_screenshot_on_other_users_inspiration_returns_400(
        self, authenticated_api_client, django_user_model, api_user
    ):
        other = django_user_model.objects.create_user(username='owner2', password='pw')
        ins = Inspiration.objects.create(
            user=other,
            source_title='S',
            essence='E',
            source_type='book',
        )
        r = authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': _tiny_jpeg_upload()},
            format='multipart',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_filtered_by_inspiration_query(self, authenticated_api_client, api_user):
        ins = Inspiration.objects.create(
            user=api_user,
            source_title='S',
            essence='E',
            source_type='book',
        )
        other = Inspiration.objects.create(
            user=api_user,
            source_title='Other',
            essence='O',
            source_type='book',
        )
        authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': _tiny_jpeg_upload('a.jpg')},
            format='multipart',
        )
        authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': other.pk, 'image': _tiny_jpeg_upload('b.jpg')},
            format='multipart',
        )
        r = authenticated_api_client.get('/api/v1/screenshots/', {'inspiration': ins.pk})
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 1
        assert r.data['results'][0]['inspiration'] == ins.pk

    def test_list_with_invalid_inspiration_filter_returns_400(self, authenticated_api_client):
        r = authenticated_api_client.get('/api/v1/screenshots/', {'inspiration': 'not-a-number'})
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        assert 'inspiration' in r.data

    def test_invalid_screenshot_returns_404(self, authenticated_api_client):
        r = authenticated_api_client.get('/api/v1/screenshots/9999999/')
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_screenshot_deletion_returns_404(self, authenticated_api_client):
        r = authenticated_api_client.delete('/api/v1/screenshots/99999/')
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_and_delete(self, authenticated_api_client, api_user):
        ins = Inspiration.objects.create(
            user=api_user,
            source_title='S',
            essence='E',
            source_type='book',
        )
        create = authenticated_api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': _tiny_jpeg_upload()},
            format='multipart',
        )
        assert create.status_code == status.HTTP_201_CREATED
        pk = create.data['id']

        r = authenticated_api_client.get(f'/api/v1/screenshots/{pk}/')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['inspiration'] == ins.pk

        r2 = authenticated_api_client.delete(f'/api/v1/screenshots/{pk}/')
        assert r2.status_code == status.HTTP_204_NO_CONTENT
        assert not Screenshot.objects.filter(pk=pk).exists()


@pytest.mark.django_db
class TestInspirationDraftPreview:
    def test_preview_comic_skips_ocr(self, authenticated_api_client, settings):
        settings.OCR_SPACE_API_KEY = ''
        img = _tiny_jpeg_upload()
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/preview/',
            {
                'source_title': 'T',
                'essence': 'E',
                'source_type': 'book',
                'user_thoughts': 'caption',
                'comic_panel': '1',
                'screenshots': img,
            },
            format='multipart',
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['form_data']['is_comic_panel'] is True
        assert r.data['screenshots'][0]['extracted_text'] == ''


@pytest.mark.django_db
class TestInspirationDraftCommit:
    def test_commit_links_optional_source(self, authenticated_api_client, api_user):
        src = Source.objects.create(
            user=api_user,
            title='On shelf',
            source_type='book',
        )
        payload = {
            'source_title': 'Shown title',
            'essence': 'Essence',
            'user_thoughts': 'A thought',
            'source_type': 'book',
            'reference': '',
            'source': src.pk,
            'screenshots': [],
        }
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            payload,
            format='json',
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data['source'] == src.pk
        assert Inspiration.objects.get(pk=r.data['id']).source_id == src.pk

    def test_commit_rejects_other_users_source(
        self, authenticated_api_client, django_user_model
    ):
        other = django_user_model.objects.create_user(username='o2', password='pw')
        src = Source.objects.create(user=other, title='Foreign', source_type='book')
        payload = {
            'source_title': 'T',
            'essence': 'E',
            'user_thoughts': 'x',
            'source_type': 'book',
            'reference': '',
            'source': src.pk,
            'screenshots': [],
        }
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            payload,
            format='json',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_commit_comic_panel_saves_screenshot_without_extracted_text(
        self, authenticated_api_client, api_user
    ):
        payload = {
            'source_title': 'My comic',
            'essence': 'Ch1',
            'user_thoughts': '',
            'source_type': 'book',
            'reference': '',
            'is_comic_panel': True,
            'screenshots': [
                {
                    'image_base64': _tiny_jpeg_b64(),
                    'filename': 'panel.jpg',
                    'extracted_text': '',
                }
            ],
        }
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            payload,
            format='json',
        )
        assert r.status_code == status.HTTP_201_CREATED
        ins = Inspiration.objects.get(pk=r.data['id'])
        assert ins.quote in (None, '')
        assert Screenshot.objects.filter(inspiration=ins).count() == 1
        shot = Screenshot.objects.get(inspiration=ins)
        assert (shot.extracted_text or '').strip() == ''

    def test_commit_ocr_saves_quote_only_no_screenshot_rows(
        self, authenticated_api_client, api_user
    ):
        payload = {
            'source_title': 'Book',
            'essence': 'Ch2',
            'user_thoughts': '',
            'source_type': 'book',
            'reference': '',
            'is_comic_panel': False,
            'screenshots': [
                {
                    'image_base64': _tiny_jpeg_b64(),
                    'filename': 'page.jpg',
                    'extracted_text': 'Highlighted passage text.',
                }
            ],
        }
        r = authenticated_api_client.post(
            '/api/v1/inspiration-drafts/commit/',
            payload,
            format='json',
        )
        assert r.status_code == status.HTTP_201_CREATED
        ins = Inspiration.objects.get(pk=r.data['id'])
        assert ins.quote == 'Highlighted passage text.'
        assert Screenshot.objects.filter(inspiration=ins).count() == 0
