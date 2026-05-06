import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_api_client(django_user_model):
    user = django_user_model.objects.create_user(
        username='api_tester',
        password='test-pass-123',
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client
