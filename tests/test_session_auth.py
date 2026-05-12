import json

import pytest
from django.test import Client


@pytest.mark.django_db
def test_auth_csrf_sets_cookie():
    c = Client()
    r = c.get('/api/v1/auth/csrf/')
    assert r.status_code == 200
    assert 'csrftoken' in r.cookies
    data = r.json()
    assert data['detail'] == 'ok'
    assert data['csrfToken']
    assert 'no-store' in r['Cache-Control']


@pytest.mark.django_db
def test_auth_me_anonymous():
    c = Client()
    r = c.get('/api/v1/auth/me/')
    assert r.status_code == 401


@pytest.mark.django_db
def test_auth_login_logout_flow(django_user_model):
    django_user_model.objects.create_user(
        username='alice', password='secret123'
    )
    c = Client(enforce_csrf_checks=True)
    r0 = c.get('/api/v1/auth/csrf/')
    assert r0.status_code == 200
    token = c.cookies['csrftoken'].value

    r1 = c.post(
        '/api/v1/auth/login/',
        data=json.dumps({'username': 'alice', 'password': 'secret123'}),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=token,
    )
    assert r1.status_code == 200
    data = r1.json()
    assert data['username'] == 'alice'

    r2 = c.get('/api/v1/auth/me/')
    assert r2.status_code == 200
    assert r2.json()['username'] == 'alice'

    token2 = c.cookies['csrftoken'].value
    r3 = c.post(
        '/api/v1/auth/logout/',
        HTTP_X_CSRFTOKEN=token2,
    )
    assert r3.status_code == 200

    r4 = c.get('/api/v1/auth/me/')
    assert r4.status_code == 401


@pytest.mark.django_db
def test_auth_login_bad_password(django_user_model):
    django_user_model.objects.create_user(
        username='bob', password='right-pass'
    )
    c = Client(enforce_csrf_checks=True)
    c.get('/api/v1/auth/csrf/')
    token = c.cookies['csrftoken'].value
    r = c.post(
        '/api/v1/auth/login/',
        data=json.dumps({'username': 'bob', 'password': 'wrong'}),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=token,
    )
    assert r.status_code == 400
