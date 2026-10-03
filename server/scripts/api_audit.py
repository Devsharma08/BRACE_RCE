#!/usr/bin/env python3
"""
API response audit for BRACE RCE.

Probes every reachable endpoint and records status, latency and payload size so
regressions are visible. Auth-protected routes are probed WITHOUT a token on
purpose: a 401 is the correct answer, and anything else means the guard is
missing or the route is unintentionally public.
"""
import json
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:3000"
TIMEOUT = 30

# (method, path, note)
PROBES = [
    # ── health / meta ─────────────────────────────────────────────
    ("GET",  "/health",                    "liveness + dependency checks"),
    ("GET",  "/metrics",                   "prometheus scrape"),
    ("GET",  "/api-docs.json",             "swagger spec (dev only)"),
    ("GET",  "/api/csrf-token",            "csrf bootstrap"),
    ("GET",  "/live",                      "k8s liveness"),
    ("GET",  "/ready",                     "k8s readiness"),
    ("GET",  "/startup",                   "k8s startup"),
    ("GET",  "/",                          "root (API does not serve UI)"),

    # ── problems ──────────────────────────────────────────────────
    ("GET",  "/api/problems/system",       "paged system problems"),
    ("GET",  "/api/problems/system?page=1&limit=5",  "paged, small limit"),
    ("GET",  "/api/problems/system?page=99999&limit=5", "page past the end"),
    ("GET",  "/api/problems/system?limit=abc",  "bad query type -> expect 400"),
    ("GET",  "/api/problems/custom",       "auth required"),
    ("GET",  "/api/problems/does-not-exist-xyz", "unknown id"),

    # ── execute (the important one) ───────────────────────────────
    ("POST", "/api/execute",               "empty body -> expect 400"),

    # ── auth ──────────────────────────────────────────────────────
    ("POST", "/api/auth/signin",           "empty body -> expect 400"),
    ("POST", "/api/auth/signup",           "empty body -> expect 400"),
    ("GET",  "/api/auth/me",               "auth required"),

    # ── user-scoped ───────────────────────────────────────────────
    ("GET",  "/api/profile",               "auth required"),
    ("GET",  "/api/analytics",             "auth required"),
    ("GET",  "/api/leaderboard",           "may be public"),
    ("GET",  "/api/roadmap",               "may be public"),
    ("GET",  "/api/notifications",         "auth required"),
    ("GET",  "/api/friends",               "auth required"),
    ("GET",  "/api/feedback",              "may be public"),
    ("GET",  "/api/rooms",                 "auth required"),
    ("GET",  "/api/learning-paths",        "may be public"),
    ("GET",  "/api/learning-items",        "auth required"),
    ("GET",  "/api/admin",                 "auth required"),
]

POST_BODIES = {
    "/api/execute": {"code": "console.log(1)", "language": "javascript", "mode": "RUN"},
    "/api/auth/signin": {},
    "/api/auth/signup": {},
}


def probe(method, path, note):
    url = BASE + path
    data = None
    headers = {"Accept": "application/json"}
    if method == "POST":
        body = POST_BODIES.get(path, {})
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            payload = r.read()
            status, ctype = r.status, r.headers.get("Content-Type", "?")
    except urllib.error.HTTPError as e:
        payload = e.read()
        status, ctype = e.code, e.headers.get("Content-Type", "?")
    except Exception as e:  # connection refused, DNS, timeout
        return {
            "method": method, "path": path, "note": note,
            "status": "ERR", "ms": round((time.perf_counter() - t0) * 1000),
            "bytes": 0, "ctype": "-", "err": str(e)[:60],
        }
    ms = round((time.perf_counter() - t0) * 1000)
    return {
        "method": method, "path": path, "note": note,
        "status": status, "ms": ms, "bytes": len(payload),
        "ctype": ctype.split(";")[0],
        "gzip": "gzip" in (ctype or ""),
    }


def main():
    rows = [probe(m, p, n) for m, p, n in PROBES]

    print(f"{'METHOD':7} {'STATUS':>6} {'MS':>6} {'BYTES':>9}  {'ENCODING':10} PATH")
    print("-" * 92)
    for r in rows:
        enc = r.get("ctype", "-") + ("+gzip" if r.get("gzip") else "")
        st = r["status"] if r["status"] == "ERR" else f"{r['status']}"
        print(f"{r['method']:7} {st:>6} {r['ms']:>6} {r['bytes']:>9}  {enc:10} {r['path']}")
        if r.get("err"):
            print(f"{'':7} {'':>6} {'':>6} {'':>9}  !! {r['err']}")

    ok = [r for r in rows if r["status"] == "ERR"]
    slow = sorted([r for r in rows if r["status"] != "ERR"], key=lambda x: -x["ms"])[:5]
    big = sorted([r for r in rows if r["status"] != "ERR"], key=lambda x: -x["bytes"])[:5]

    print("\n── slowest ──")
    for r in slow:
        print(f"  {r['ms']:>6} ms  {r['method']:5} {r['path']}")
    print("── largest payloads ──")
    for r in big:
        print(f"  {r['bytes']:>9} B  {r['method']:5} {r['path']}")
    if ok:
        print(f"\n!! {len(ok)} endpoint(s) unreachable")

    with open("/tmp/api_audit.json", "w") as f:
        json.dump(rows, f, indent=2)
    print("\nwrote /tmp/api_audit.json")


if __name__ == "__main__":
    main()
