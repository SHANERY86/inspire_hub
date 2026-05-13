from django.urls import resolve


def test_request_account_url_resolves_to_spa_index():
    match = resolve('/request-account/')
    assert match.url_name == 'request-account'
    assert match.func.__name__ == 'spa_index'


def test_home_url_resolves_to_spa_index():
    match = resolve('/')
    assert match.url_name == 'home'
    assert match.func.__name__ == 'spa_index'
