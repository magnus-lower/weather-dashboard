import pytest

from app.utils import validation


def test_validate_coordinates_success():
    is_valid, error = validation.validate_coordinates("59.0", "10.0")
    assert is_valid is True
    assert error is None


def test_validate_coordinates_out_of_range():
    is_valid, error = validation.validate_coordinates("100", "10")
    assert is_valid is False
    assert "Breddegrad" in error


def test_validate_coordinates_invalid_type():
    is_valid, error = validation.validate_coordinates("abc", "xyz")
    assert is_valid is False
    assert "Koordinater" in error


def test_validate_city_name_success():
    is_valid, error = validation.validate_city_name("Oslo")
    assert is_valid is True
    assert error is None


def test_validate_city_name_rejects_short():
    is_valid, error = validation.validate_city_name("O")
    assert is_valid is False
    assert "minst 2" in error


def test_validate_city_name_invalid_characters():
    is_valid, error = validation.validate_city_name("Oslo123")
    assert is_valid is False
    assert "ugyldige" in error


def test_validate_country_code_success():
    is_valid, error = validation.validate_country_code("no")
    assert is_valid is True
    assert error is None


def test_validate_country_code_invalid_length():
    is_valid, error = validation.validate_country_code("NOR")
    assert is_valid is False
    assert "2 tegn" in error


def test_sanitize_input_strips_and_removes_tags():
    cleaned = validation.sanitize_input("  <b>Oslo</b>; DROP TABLE  ")
    assert cleaned == "Oslo DROP TABLE"
