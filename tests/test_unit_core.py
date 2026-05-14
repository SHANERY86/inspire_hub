"""Unit-style tests: pure helpers and serializer validation without HTTP round-trips."""

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from core.models import Source
from core.preview_payload import preview_session_valid
from core.serializers import SourceSerializer
from core.source_isbn import normalize_isbn, openlibrary_lookup_isbn


class TestNormalizeIsbn:
    def test_empty_and_whitespace_returns_empty_string(self):
        assert normalize_isbn('') == ''
        assert normalize_isbn('   ') == ''

    def test_strips_hyphens_and_spaces_13_digit(self):
        assert normalize_isbn('978-0-141-03614-4') == '9780141036144'

    def test_isbn10_with_trailing_x_preserved(self):
        assert normalize_isbn('0-451-52653-X') == '045152653X'

    def test_isbn10_all_numeric(self):
        assert normalize_isbn('0451526536') == '0451526536'


class TestPreviewSessionValid:
    def test_empty_or_non_dict_false(self):
        assert preview_session_valid({}, []) is False
        assert preview_session_valid(None, []) is False

    def test_missing_required_field_false(self):
        assert (
            preview_session_valid(
                {'source_title': '', 'essence': 'e', 'source_type': 'book'},
                [],
            )
            is False
        )

    def test_all_required_present_true(self):
        assert (
            preview_session_valid(
                {
                    'source_title': '  T  ',
                    'essence': 'E',
                    'source_type': 'book',
                },
                [],
            )
            is True
        )

    def test_non_list_screenshot_data_false(self):
        assert (
            preview_session_valid(
                {
                    'source_title': 'T',
                    'essence': 'E',
                    'source_type': 'book',
                },
                'not-a-list',
            )
            is False
        )


class TestOpenlibraryLookupIsbn:
    @patch('core.source_isbn.requests.get')
    def test_returns_none_when_key_missing(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        assert openlibrary_lookup_isbn('9780141036144') is None

    @patch('core.source_isbn.requests.get')
    def test_maps_title_authors_and_cover_fallback(self, mock_get):
        key = 'ISBN:9780141036144'
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            key: {
                'title': '  1984  ',
                'authors': [{'name': 'George Orwell'}],
                'publish_date': '1949',
                'info_url': 'https://openlibrary.org/works/OL123456W',
                'cover': {},
            }
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        out = openlibrary_lookup_isbn('9780141036144')
        assert out is not None
        assert out['title'] == '1984'
        assert out['authors'] == ['George Orwell']
        assert out['publish_date'] == '1949'
        assert out['openlibrary_url'] == 'https://openlibrary.org/works/OL123456W'
        assert out['cover_url'] == (
            'https://covers.openlibrary.org/b/isbn/9780141036144-L.jpg'
        )


@pytest.mark.django_db
class TestSourceSerializerValidateIsbn:
    def test_invalid_length_returns_field_error(self):
        factory = APIRequestFactory()
        request = factory.post('/api/v1/sources/')
        User = get_user_model()
        request.user = User.objects.create_user('ser_unit', 'pw-unit-123')
        ser = SourceSerializer(
            data={
                'title': 'Book',
                'source_type': 'book',
                'isbn': '12345',
            },
            context={'request': request},
        )
        assert ser.is_valid() is False
        assert 'isbn' in ser.errors

    def test_duplicate_isbn_for_same_user_object_level(self):
        factory = APIRequestFactory()
        request = factory.post('/api/v1/sources/')
        User = get_user_model()
        user = User.objects.create_user('ser_dup', 'pw-dup-123')
        request.user = user
        Source.objects.create(
            user=user,
            title='Existing',
            source_type='book',
            isbn='9780141036144',
        )
        ser = SourceSerializer(
            data={
                'title': 'Another',
                'source_type': 'book',
                'isbn': '978-0-141-03614-4',
            },
            context={'request': request},
        )
        assert ser.is_valid() is False
        assert 'isbn' in ser.errors
