import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def api_user(django_user_model):
    return django_user_model.objects.create_user(
        username='api_tester',
        password='test-pass-123',
    )


@pytest.fixture
def authenticated_api_client(api_user):
    client = APIClient()
    client.force_authenticate(user=api_user)
    return client
