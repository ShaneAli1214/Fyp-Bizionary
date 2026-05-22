CATEGORY_COMPANIES = {
    'tech': 'Tech Solutions',
    'stationary': 'XYZ Industries',
    'stationery': 'XYZ Industries',
    'medicines': 'MediCare Pharma',
    'medicine': 'MediCare Pharma',
}


DEFAULT_COMPANY = 'XYZ Industries'


def normalize_category(value):
    return str(value or '').strip().lower()


def company_for_category(category):
    key = normalize_category(category)
    return CATEGORY_COMPANIES.get(key, DEFAULT_COMPANY)
