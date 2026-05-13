import json

import pytest
from django.core import mail
from django.test import Client, override_settings


@pytest.mark.django_db
def test_signup_request_requires_csrf():
    c = Client(enforce_csrf_checks=True)
    r = c.post(
        '/api/v1/auth/signup-request/',
        data=json.dumps(
            {
                'first_name': 'A',
                'last_name': 'B',
                'location': 'Here',
                'email': 'a@b.co',
                'username': 'newuser',
                'password': 'longenough',
            }
        ),
        content_type='application/json',
    )
    assert r.status_code == 403


@pytest.mark.django_db
def test_signup_request_sends_email():
    c = Client(enforce_csrf_checks=True)
    c.get('/api/v1/auth/csrf/')
    token = c.cookies['csrftoken'].value

    r = c.post(
        '/api/v1/auth/signup-request/',
        data=json.dumps(
            {
                'first_name': 'Sam',
                'last_name': 'River',
                'location': 'Portland, OR',
                'email': 'sam@example.com',
                'username': 'samriver',
                'password': 'hunter2secret',
            }
        ),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=token,
    )
    assert r.status_code == 200
    assert r.json()['detail'] == 'ok'
    assert len(mail.outbox) == 1
    msg = mail.outbox[0]
    assert msg.subject == 'inspire hub login request'
    assert 'sam@example.com' in msg.body
    assert 'samriver' in msg.body
    assert 'hunter2secret' in msg.body
    assert 'Portland, OR' in msg.body


@pytest.mark.django_db
def test_signup_request_invalid_email():
    c = Client(enforce_csrf_checks=True)
    c.get('/api/v1/auth/csrf/')
    token = c.cookies['csrftoken'].value
    r = c.post(
        '/api/v1/auth/signup-request/',
        data=json.dumps(
            {
                'first_name': 'A',
                'last_name': 'B',
                'location': 'Here',
                'email': 'not-an-email',
                'username': 'u1',
                'password': '12345678',
            }
        ),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=token,
    )
    assert r.status_code == 400


@pytest.mark.django_db
@override_settings(SIGNUP_REQUEST_NOTIFICATION_EMAIL='')
def test_signup_request_missing_recipient_config():
    c = Client(enforce_csrf_checks=True)
    c.get('/api/v1/auth/csrf/')
    token = c.cookies['csrftoken'].value
    r = c.post(
        '/api/v1/auth/signup-request/',
        data=json.dumps(
            {
                'first_name': 'A',
                'last_name': 'B',
                'location': 'Here',
                'email': 'a@b.co',
                'username': 'u1',
                'password': '12345678',
            }
        ),
        content_type='application/json',
        HTTP_X_CSRFTOKEN=token,
    )
    assert r.status_code == 503
