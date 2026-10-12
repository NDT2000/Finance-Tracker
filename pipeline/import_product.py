"""Authenticated, sequential CSV backfill through the canonical application API."""
import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request
import uuid


class ProductClient:
    def __init__(self, base_url, origin):
        self.base_url = base_url.rstrip('/')
        self.origin = origin
        self.token = os.environ.get('FINANCE_ACCESS_TOKEN')
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        if not self.token:
            self.token = self.request('/api/auth/login', {'email': os.environ['FINANCE_EMAIL'],
                                                        'password': os.environ['FINANCE_PASSWORD']}, auth=False)['token']

    def request(self, path, data=None, auth=True, content_type='application/json', retry=True):
        body = json.dumps(data).encode() if isinstance(data, dict) else data
        headers = {'Origin': self.origin, 'X-Requested-With': 'FinanceTracker', 'Content-Type': content_type}
        if auth and self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        req = urllib.request.Request(self.base_url + path, data=body, headers=headers)
        try:
            with self.opener.open(req, timeout=30) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            if exc.code == 401 and auth and retry:
                self.token = self.request('/api/auth/refresh', b'', auth=False)['token']
                return self.request(path, data, auth=True, content_type=content_type, retry=False)
            raise RuntimeError(f'API request failed with HTTP {exc.code}') from None

    def upload(self, file_path, account):
        path = Path(file_path)
        content = path.read_bytes()
        if not content or len(content) > 2 * 1024 * 1024:
            raise ValueError('CSV must contain data and be at most 2 MiB')
        boundary = 'finance-' + uuid.uuid4().hex
        # Fixed safe multipart filename; the contract never places user paths in HTTP headers.
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="accountRef"\r\n\r\n{account}\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name.replace(chr(34), "_").replace(chr(13), "_").replace(chr(10), "_")}"\r\n'
                'Content-Type: text/csv\r\n\r\n').encode() + content + f'\r\n--{boundary}--\r\n'.encode()
        # One transport retry is safe: the server keys the batch by owner/account/content hash.
        for attempt in range(2):
            try:
                return self.request('/api/imports', body, content_type=f'multipart/form-data; boundary={boundary}')
            except (urllib.error.URLError, TimeoutError):
                if attempt: raise

    def wait(self, batch_id, timeout):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            result = self.request(f'/api/imports/{batch_id}')
            if result['status'] not in ('QUEUED', 'PROCESSING'):
                return result
            time.sleep(1)
        raise TimeoutError('Job is still pending; inspect its history or resume by uploading the same file')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='+', type=Path)
    parser.add_argument('--account', required=True)
    parser.add_argument('--base-url', default=os.environ.get('FINANCE_BASE_URL', 'http://localhost:8080'))
    parser.add_argument('--origin', default=os.environ.get('FINANCE_ORIGIN', 'http://localhost'))
    parser.add_argument('--timeout', type=int, default=600)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--retry-failed', action='store_true')
    parser.add_argument('--continue-on-attention', action='store_true')
    args = parser.parse_args()
    if not args.account or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-' for c in args.account) or len(args.account) > 80:
        parser.error('Account reference must use 1–80 letters, digits, dots, underscores or hyphens')
    results = []
    try:
        client = ProductClient(args.base_url, args.origin)
        for path in sorted(args.files):
            batch = client.upload(path, args.account)
            if args.retry_failed and batch['status'] == 'FAILED' and batch.get('retryable'):
                batch = client.request(f"/api/imports/{batch['id']}/retry", {})
            result = client.wait(batch['id'], args.timeout)
            results.append(result)
            print(f"batch={result['id']} status={result['status']} rows={result['total_rows']} repeated={batch['repeated']}")
            if result['status'] != 'COMPLETED' and not args.continue_on_attention:
                break
        if args.report:
            args.report.write_text(json.dumps(results, indent=2) + '\n')
        return 0 if len(results) == len(args.files) and all(r['status'] == 'COMPLETED' for r in results) else 2
    except (KeyError, RuntimeError, OSError, ValueError) as exc:
        print(f'Import stopped ({type(exc).__name__}); inspect import history. Credentials and raw contents are not logged.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
