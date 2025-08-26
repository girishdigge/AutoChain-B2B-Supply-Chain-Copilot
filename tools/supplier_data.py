from typing import List, Dict

SUPPLIERS: Dict[str, List[dict]] = {
    "Lamborghini": [
        {
            "name": "Lamborghini Official",
            "moq": 1,
            "lead_time_weeks": 10,
            "pricing_tiers": [(1, 500000), (5, 480000)],
        },
        {
            "name": "Elite Supercars Ltd",
            "moq": 1,
            "lead_time_weeks": 12,
            "pricing_tiers": [(1, 520000), (5, 490000)],
        },
    ],
    "Porsche": [
        {
            "name": "Porsche Official",
            "moq": 1,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 120000), (5, 115000)],
        },
        {
            "name": "Euro Motors GmbH",
            "moq": 2,
            "lead_time_weeks": 7,
            "pricing_tiers": [(1, 125000), (5, 118000)],
        },
    ],
    "Mercedes Benz": [
        {
            "name": "Mercedes Official",
            "moq": 1,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 100000), (5, 95000)],
        },
        {
            "name": "LuxuryDrive Distributors",
            "moq": 2,
            "lead_time_weeks": 7,
            "pricing_tiers": [(1, 102000), (5, 97000)],
        },
    ],
    "BMW": [
        {
            "name": "BMW Official",
            "moq": 1,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 90000), (5, 87000)],
        },
        {
            "name": "EuroDrive Supplies",
            "moq": 2,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 92000), (5, 88000)],
        },
    ],
    "Ferrari": [
        {
            "name": "Ferrari Official",
            "moq": 1,
            "lead_time_weeks": 10,
            "pricing_tiers": [(1, 300000), (3, 280000)],
        },
        {
            "name": "Exotic Car Imports",
            "moq": 1,
            "lead_time_weeks": 12,
            "pricing_tiers": [(1, 310000), (3, 290000)],
        },
    ],
    "Land Rover": [
        {
            "name": "Land Rover Official",
            "moq": 1,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 95000), (5, 92000)],
        },
        {
            "name": "British Auto Supplies",
            "moq": 2,
            "lead_time_weeks": 7,
            "pricing_tiers": [(1, 97000), (5, 94000)],
        },
    ],
    "Ford": [
        {
            "name": "Ford Official",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 30000), (5, 28000)],
        },
        {
            "name": "North America Auto Export",
            "moq": 3,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 31000), (5, 29000)],
        },
    ],
    "Kia": [
        {
            "name": "Kia Official",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 28000), (5, 26500)],
        },
        {
            "name": "Asian Auto Exports",
            "moq": 3,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 29000), (5, 27000)],
        },
    ],
    "Volkswagen": [
        {
            "name": "Volkswagen Official",
            "moq": 2,
            "lead_time_weeks": 4,
            "pricing_tiers": [(1, 25000), (5, 24000)],
        },
        {
            "name": "Euro AutoHaus",
            "moq": 3,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 26000), (5, 24500)],
        },
    ],
    "Hyundai": [
        {
            "name": "Hyundai Official",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 27000), (5, 25500)],
        },
        {
            "name": "Korean Auto Supply",
            "moq": 3,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 28000), (5, 26000)],
        },
    ],
    "Audi": [
        {
            "name": "Audi Official",
            "moq": 2,
            "lead_time_weeks": 4,
            "pricing_tiers": [(1, 32000), (5, 30500)],
        },
        {
            "name": "German Auto Group",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 33000), (5, 31000)],
        },
    ],
    "Mini": [
        {
            "name": "Mini Official",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 22000), (5, 21000)],
        },
        {
            "name": "Urban Auto Imports",
            "moq": 3,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 23000), (5, 21500)],
        },
    ],
    "Chevrolet": [
        {
            "name": "Chevrolet Official",
            "moq": 2,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 39000), (5, 37000)],
        },
        {
            "name": "USA Auto Traders",
            "moq": 3,
            "lead_time_weeks": 7,
            "pricing_tiers": [(1, 40000), (5, 38000)],
        },
    ],
    "RAM": [
        {
            "name": "RAM Official",
            "moq": 2,
            "lead_time_weeks": 7,
            "pricing_tiers": [(1, 38000), (5, 36500)],
        },
        {
            "name": "American Auto Exports",
            "moq": 3,
            "lead_time_weeks": 8,
            "pricing_tiers": [(1, 39000), (5, 37000)],
        },
    ],
    "Toyota": [
        {
            "name": "Toyota Official",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 30000), (5, 28500)],
        },
        {
            "name": "Asia Auto Trading",
            "moq": 3,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 31000), (5, 29500)],
        },
    ],
    "Honda": [
        {
            "name": "Honda Official",
            "moq": 2,
            "lead_time_weeks": 5,
            "pricing_tiers": [(1, 22000), (5, 21000)],
        },
        {
            "name": "Global Honda Supplies",
            "moq": 3,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 23000), (5, 21500)],
        },
    ],
    "Tesla": [
        {
            "name": "Tesla Official",
            "moq": 1,
            "lead_time_weeks": 8,
            "pricing_tiers": [(1, 40000), (5, 38500)],
        },
        {
            "name": "EV Global Distributors",
            "moq": 2,
            "lead_time_weeks": 9,
            "pricing_tiers": [(1, 41000), (5, 39000)],
        },
    ],
    "Jeep": [
        {
            "name": "Jeep Official",
            "moq": 2,
            "lead_time_weeks": 6,
            "pricing_tiers": [(1, 42000), (5, 40500)],
        },
        {
            "name": "SUV Masters Ltd",
            "moq": 3,
            "lead_time_weeks": 7,
            "pricing_tiers": [(1, 43000), (5, 41000)],
        },
    ],
    "Tata": [
        {
            "name": "Tata Motors Official",
            "moq": 5,
            "lead_time_weeks": 3,
            "pricing_tiers": [(1, 10000), (10, 9500)],
        },
        {
            "name": "Indian Auto Dealers",
            "moq": 10,
            "lead_time_weeks": 4,
            "pricing_tiers": [(1, 10500), (10, 9700)],
        },
    ],
    "Maruti Suzuki": [
        {
            "name": "Maruti Suzuki Official",
            "moq": 5,
            "lead_time_weeks": 3,
            "pricing_tiers": [(1, 9000), (10, 8500)],
        },
        {
            "name": "Indian Auto Distribution",
            "moq": 10,
            "lead_time_weeks": 4,
            "pricing_tiers": [(1, 9500), (10, 8700)],
        },
    ],
    "Mahindra": [
        {
            "name": "Mahindra Official",
            "moq": 5,
            "lead_time_weeks": 3,
            "pricing_tiers": [(1, 16000), (10, 15500)],
        },
        {
            "name": "SUV India Distributors",
            "moq": 10,
            "lead_time_weeks": 4,
            "pricing_tiers": [(1, 16500), (10, 15700)],
        },
    ],
}
