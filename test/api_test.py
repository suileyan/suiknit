#!/usr/bin/env python3
"""
Simple API test client for Suiknit.

Usage:
  python test/api_test.py --base-url http://localhost:3000 \
      --token <JWT> [--file-id <id>]

Notes:
  - Registration/Login flows are skipped (captcha involved).
  - The provided token should have admin privileges, as requested.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, Optional

import requests


def make_session(token: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "suiknit-test-client/1.0",
    })
    return s


def pretty(obj: Any) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, indent=2)
    except Exception:
        return str(obj)


def do_get(s: requests.Session, url: str, params: Optional[Dict[str, Any]] = None) -> None:
    try:
        resp = s.get(url, params=params, timeout=15)
        print(f"GET {resp.request.url} -> {resp.status_code}")
        ctype = resp.headers.get("Content-Type", "")
        if "application/json" in ctype:
            print(pretty(resp.json()))
        else:
            text = resp.text
            print(text[:1000] + ("..." if len(text) > 1000 else ""))
    except Exception as e:
        print(f"GET {url} failed: {e}")


def do_post(s: requests.Session, url: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        resp = s.post(url, data=json.dumps(data), timeout=20)
        print(f"POST {url} -> {resp.status_code}")
        try:
            payload = resp.json()
            print(pretty(payload))
            return payload
        except Exception:
            print(resp.text[:1000])
            return None
    except Exception as e:
        print(f"POST {url} failed: {e}")
        return None


def probe_base(session: requests.Session, base: str) -> bool:
    try:
        r = session.get(base.rstrip('/') + "/api-docs/swagger.json", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Suiknit API test client")
    parser.add_argument("--base-url", default="http://localhost:3000", help="API base URL")
    parser.add_argument(
        "--token",
        default=(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJpZCI6IjY4Y2EwZTM2M2M3N2M4MmI5ZmM1MWVlNyIsImVtYWlsIjoiMzIyMDE0NTkzMUBxcS5jb20iLCJuYW1lIjoic3VpbGV5YW4iLCJpYXQiOjE3NTkxMTc4MTEs"
            "ImV4cCI6MTc2MTcwOTgxMSwiaXNzIjoic3Vpa25pdC1hcGkifQ._AoKaEAxk91La6INH50giSbnXL-5lZpAEY_GaVrY9t8"
        ),
        help="JWT token with admin privileges",
    )
    parser.add_argument("--file-id", default=None, help="Optional fileId to test file endpoints")
    parser.add_argument("--auto-detect", action="store_true", help="Try common base URLs if the provided one fails")

    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    token = args.token
    file_id = args.file_id
    s = make_session(token)

    # Optional base URL auto-detect if current base looks down/bad gateway
    if args.auto_detect:
        ok = probe_base(s, base)
        if not ok:
            candidates = [
                "http://localhost:4000",
                "http://127.0.0.1:4000",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
            for cand in candidates:
                if cand.rstrip('/') == base:
                    continue
                if probe_base(s, cand):
                    print(f"Auto-detected base URL: {cand}")
                    base = cand.rstrip('/')
                    break

    print(f"Base URL: {base}")

    print("== Basic ==")
    do_get(s, f"{base}/")
    do_get(s, f"{base}/api-docs/swagger.json")

    print("\n== Auth ==")
    do_get(s, f"{base}/dev/auth/loginByToken")

    print("\n== Admin ==")
    do_get(s, f"{base}/dev/admin/users")
    do_get(s, f"{base}/dev/admin/logs/files")
    do_get(s, f"{base}/dev/admin/logs", params={"tail": 100})

    if file_id:
        print("\n== File (public info) ==")
        do_get(s, f"{base}/dev/file/public", params={"fileId": file_id})

        print("\n== File (download token) ==")
        payload = do_post(s, f"{base}/dev/file/download/token", data={"fileId": file_id})
        if payload and isinstance(payload, dict):
            data = payload.get("data") or payload
            # Try to locate a downloadUrl
            dl = data.get("downloadUrl") if isinstance(data, dict) else None
            if dl:
                print("\n== File (download by token) ==")
                # stream first bytes
                try:
                    with s.get(f"{base}{dl}", stream=True, timeout=30, headers={"Range": "bytes=0-1023"}) as r:
                        print(f"GET {base}{dl} -> {r.status_code}")
                        chunk = next(r.iter_content(chunk_size=1024), b"")
                        print(f"Read {len(chunk)} bytes")
                except Exception as e:
                    print(f"Download failed: {e}")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
