from pagination import paginate

ITEMS = [1, 2, 3, 4, 5, 6, 7]


def test_page_one_returns_first_block():
    assert paginate(ITEMS, 1, 3) == [1, 2, 3]


def test_page_two_returns_next_block():
    assert paginate(ITEMS, 2, 3) == [4, 5, 6]


def test_last_page_may_be_partial():
    assert paginate(ITEMS, 3, 3) == [7]


def test_page_past_the_end_is_empty():
    assert paginate(ITEMS, 4, 3) == []


def test_page_size_larger_than_list_returns_everything():
    assert paginate(ITEMS, 1, 100) == ITEMS
