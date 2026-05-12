from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestSourcesAPI:
    def test_list_requires_auth(self, api_client):
        r = api_client.get('/api/v1/sources/')
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_list_empty(self, authenticated_api_client):
        r = authenticated_api_client.get('/api/v1/sources/')
        assert r.status_code == status.HTTP_200_OK
        assert r.data['count'] == 0
        assert r.data['results'] == []

    def test_create_and_duplicate_isbn(self, authenticated_api_client):
        r = authenticated_api_client.post(
            '/api/v1/sources/',
            {
                'title': 'Nineteen Eighty-Four',
                'author': 'George Orwell',
                'isbn': '978-0-14-103614-4',
                'source_type': 'book',
            },
            format='json',
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data['title'] == 'Nineteen Eighty-Four'
        assert r.data['isbn'] == '9780141036144'

        r2 = authenticated_api_client.post(
            '/api/v1/sources/',
            {
                'title': 'Duplicate',
                'isbn': '9780141036144',
                'source_type': 'book',
            },
            format='json',
        )
        assert r2.status_code == status.HTTP_400_BAD_REQUEST
        assert 'isbn' in r2.data

    @patch('core.source_isbn.requests.get')
    def test_isbn_lookup(self, mock_get, authenticated_api_client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            'ISBN:9780141036144': {
                'title': '1984',
                'authors': [{'name': 'George Orwell'}],
                'publish_date': '2008',
                'info_url': 'https://openlibrary.org/isbn/9780141036144',
                'cover_i': 9911056,
            }
        }
        mock_get.return_value = mock_resp

        r = authenticated_api_client.get(
            '/api/v1/sources/isbn-lookup/',
            {'isbn': '978-0-14-103614-4'},
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['title'] == '1984'
        assert r.data['authors'] == ['George Orwell']
        assert r.data['cover_url'] == 'https://covers.openlibrary.org/b/id/9911056-L.jpg'

    @patch('core.source_isbn.requests.get')
    def test_isbn_lookup_cover_falls_back_to_isbn_url(self, mock_get, authenticated_api_client):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            'ISBN:9780141036144': {
                'title': '1984',
                'authors': [{'name': 'George Orwell'}],
                'publish_date': '2008',
                'info_url': 'https://openlibrary.org/isbn/9780141036144',
            }
        }
        mock_get.return_value = mock_resp
        r = authenticated_api_client.get(
            '/api/v1/sources/isbn-lookup/',
            {'isbn': '9780141036144'},
        )
        assert r.status_code == status.HTTP_200_OK
        assert r.data['cover_url'] == 'https://covers.openlibrary.org/b/isbn/9780141036144-L.jpg'

    def test_isbn_lookup_requires_auth(self, api_client):
        r = api_client.get('/api/v1/sources/isbn-lookup/', {'isbn': '9780141036144'})
        assert r.status_code == status.HTTP_403_FORBIDDEN
