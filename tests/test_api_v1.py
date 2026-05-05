import io

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


@pytest.mark.django_db
class TestInspirationCRUD:
    def test_list_empty(self, api_client):
        r = api_client.get('/api/v1/inspirations/')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 0
        assert r.data['results'] == []

    def test_create_and_retrieve(self, api_client):
        payload = {
            'source_title': 'Test Book',
            'essence': 'A memorable line',
            'quote': 'Hello world',
            'user_thoughts': 'Nice',
            'source_type': 'book',
            'reference': 'p. 42',
        }
        r = api_client.post('/api/v1/inspirations/', payload, format='json')
        assert r.status_code == status.HTTP_201_CREATED
        pk = r.data['id']

        r2 = api_client.get(f'/api/v1/inspirations/{pk}/')
        assert r2.status_code == status.HTTP_200_OK
        assert r2.data['source_title'] == 'Test Book'
        assert r2.data['essence'] == 'A memorable line'

    def test_patch_and_delete(self, api_client):
        ins = Inspiration.objects.create(
            source_title='Old',
            essence='Old essence',
            source_type='book',
        )
        r = api_client.patch(
            f'/api/v1/inspirations/{ins.pk}/',
            {'essence': 'New essence'},
            format='json',
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['essence'] == 'New essence'

        r2 = api_client.delete(f'/api/v1/inspirations/{ins.pk}/')
        assert r2.status_code == status.HTTP_204_NO_CONTENT
        assert not Inspiration.objects.filter(pk=ins.pk).exists()

    def test_create_missing_required_field_returns_400(self, api_client):
        r = api_client.post(
            '/api/v1/inspirations/',
            {'source_title': 'Only title', 'source_type': 'book'},
            format='json',
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestScreenshotCRUD:
    def test_create_requires_image_and_inspiration(self, api_client):
        ins = Inspiration.objects.create(
            source_title='S',
            essence='E',
            source_type='book',
        )
        img = _tiny_jpeg_upload()
        r = api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': img, 'extracted_text': 'ocr'},
            format='multipart',
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert Screenshot.objects.filter(inspiration=ins).count() == 1

    def test_list_filtered_by_inspiration_query(self, api_client):
        ins = Inspiration.objects.create(
            source_title='S',
            essence='E',
            source_type='book',
        )
        other = Inspiration.objects.create(
            source_title='Other',
            essence='O',
            source_type='book',
        )
        api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': _tiny_jpeg_upload('a.jpg')},
            format='multipart',
        )
        api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': other.pk, 'image': _tiny_jpeg_upload('b.jpg')},
            format='multipart',
        )
        r = api_client.get('/api/v1/screenshots/', {'inspiration': ins.pk})
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 1
        assert r.data['results'][0]['inspiration'] == ins.pk

    def test_retrieve_and_delete(self, api_client):
        ins = Inspiration.objects.create(
            source_title='S',
            essence='E',
            source_type='book',
        )
        create = api_client.post(
            '/api/v1/screenshots/',
            {'inspiration': ins.pk, 'image': _tiny_jpeg_upload()},
            format='multipart',
        )
        assert create.status_code == status.HTTP_201_CREATED
        pk = create.data['id']

        r = api_client.get(f'/api/v1/screenshots/{pk}/')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['inspiration'] == ins.pk

        r2 = api_client.delete(f'/api/v1/screenshots/{pk}/')
        assert r2.status_code == status.HTTP_204_NO_CONTENT
        assert not Screenshot.objects.filter(pk=pk).exists()
