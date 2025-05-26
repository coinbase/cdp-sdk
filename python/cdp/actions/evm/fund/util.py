from decimal import Decimal

def format_units(amount, decimals):
    return str(Decimal(amount) / (Decimal(10) ** decimals))