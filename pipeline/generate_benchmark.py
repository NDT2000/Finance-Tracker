"""Generate the deterministic 1,000-row measurement dataset without real financial data."""
import argparse
import csv
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with args.output.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.writer(stream)
        writer.writerow(['date', 'category', 'description', 'amount', 'currency', 'source_transaction_id'])
        for number in range(1000):
            writer.writerow(['2026-09-01', 'Benchmark', f'Event {number}', '1.00', 'USD', f'benchmark-{number}'])


if __name__ == '__main__':
    main()
