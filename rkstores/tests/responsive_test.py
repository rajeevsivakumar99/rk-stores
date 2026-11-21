"""
Responsive + smoke tests against a running site (default http://localhost:3100) backed by tests/mock-supabase.mjs.
Usage:  python tests/responsive_test.py [--shots DIR]
"""
import base64, json, os, sys, time
from playwright.sync_api import sync_playwright

SITE = os.environ.get("SITE", "http://localhost:3100")
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
PID = lambda n: f"00000000-0000-4000-8000-{n:012d}"

DEVICES = ["iPhone SE", "Galaxy S8", "iPhone 14 Pro Max", "Pixel 7", "iPad Mini", "iPad Pro 11"]
DESKTOPS = [("Desktop 1280", 1280, 800), ("Desktop 1536", 1536, 864)]
PUBLIC = ["/", "/products", "/products?category=toys", "/products?status=out_of_stock", f"/products/{PID(200)}", "/categories", "/offers", f"/offers/{PID(400)}", "/login", "/forgot-password"]
AUTH = ["/account", "/notifications", "/admin", "/admin/products", f"/admin/products/{PID(200)}", "/admin/categories", "/admin/offers", "/admin/holidays", "/admin/notifications", "/admin/settings"]

session = {"access_token": "a.b.c", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 36000, "refresh_token": "r",
           "user": {"id": PID(1), "aud": "authenticated", "role": "authenticated", "email": "admin@example.com", "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}}
COOKIE = {"name": "sb-localhost-auth-token", "value": "base64-" + base64.urlsafe_b64encode(json.dumps(session).encode()).decode().rstrip("="), "url": SITE}

JS_OVERFLOW = """() => {
  const W = innerWidth, bad = [];
  const clipped = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
  document.querySelectorAll('body *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && r.right > W + 1 && !clipped(el)) bad.push(el.tagName + '.' + String(el.className).slice(0, 40)); });
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) };
}"""
JS_TAPS = """() => {
  const out = [];
  document.querySelectorAll('a[href], button, select, summary, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea').forEach((el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || r.height === 0) return;
    if (el.closest('.sr-only')) return;
    if (r.height < 40 || r.width < 40) out.push((el.tagName + ' ' + (el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 25) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)));
  });
  return out;
}"""
JS_FONT = """() => [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && parseFloat(getComputedStyle(e).fontSize) < 16; }).map((e) => (e.name || e.type || e.tagName))"""
JS_NAVOVERLAP = """() => {
  const nav = document.querySelector('nav[aria-label=Main]'); const f = document.querySelector('#contact > div');
  if (!nav || !f || getComputedStyle(nav).display === 'none') return null;
  window.scrollTo(0, document.body.scrollHeight);
  const last = f.lastElementChild.getBoundingClientRect().bottom, top = nav.getBoundingClientRect().top;
  return { lastContentBottom: Math.round(last), navTop: Math.round(top), ok: last <= top + 1 };
}"""

problems, checked = [], 0
def note(kind, where, detail): problems.append((kind, where, detail))

def check_page(ctx, label, path, mobile):
    global checked
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    page.on("console", lambda m: errs.append(f"console: {m.text}") if m.type == "error" and "WebSocket" not in m.text and "realtime" not in m.text and "favicon" not in m.text else None)
    page.on("requestfailed", lambda r: errs.append(f"reqfailed: {r.url}") if "realtime" not in r.url and "favicon" not in r.url and "_rsc=" not in r.url and not r.url.endswith(".svg") else None)
    resp = page.goto(SITE + path, wait_until="networkidle")
    where = f"{label} {path}"
    checked += 1
    if resp.status >= 400: note("HTTP", where, resp.status)
    o = page.evaluate(JS_OVERFLOW)
    if o["sw"] > o["W"] + 1 or o["bad"]: note("OVERFLOW", where, o)
    if mobile:
        t = page.evaluate(JS_TAPS)
        if t: note("TAP<40px", where, t[:6])
        f = page.evaluate(JS_FONT)
        if f: note("FONT<16px", where, f)
        if not path.startswith("/admin"):
            n = page.evaluate(JS_NAVOVERLAP)
            if n and not n["ok"]: note("NAV-OVERLAP", where, n)
    if errs: note("ERRORS", where, errs[:3])
    if SHOTS and path in ("/", "/products", "/login", "/admin/products", "/admin", f"/products/{PID(201)}", "/notifications", "/admin/settings"):
        os.makedirs(SHOTS, exist_ok=True)
        page.evaluate("window.scrollTo(0,0)")
        page.screenshot(path=f"{SHOTS}/{label.replace(' ', '_')}{path.replace('/', '_').replace('?', '_')[:40]}.png")
    page.close()

with sync_playwright() as p:
    browser = p.chromium.launch()
    contexts = []
    for name in DEVICES:
        d = dict(p.devices[name]); d.pop("default_browser_type", None)
        contexts.append((name, d, d.get("is_mobile", False) or d["viewport"]["width"] < 900))
    for name, w, h in DESKTOPS: contexts.append((name, {"viewport": {"width": w, "height": h}}, False))

    for name, opts, mobile in contexts:
        ctx = browser.new_context(**opts)
        for path in PUBLIC: check_page(ctx, name, path, mobile)
        ctx.add_cookies([COOKIE])
        for path in AUTH: check_page(ctx, name, path, mobile)
        ctx.close()

    # ---------- functional smoke tests on a phone ----------
    d = dict(p.devices["iPhone SE"]); d.pop("default_browser_type", None)
    ctx = browser.new_context(**d); page = ctx.new_page()
    def ok(cond, msg):
        print(("PASS  " if cond else "FAIL  ") + msg)
        if not cond: note("FUNCTIONAL", msg, "")
    page.goto(SITE + "/", wait_until="networkidle")
    page.fill("main form input[name=q]", "pen"); page.keyboard.press("Enter"); page.wait_for_url("**/products?q=pen*"); page.wait_for_load_state("networkidle")
    ok(page.locator("main a[href^='/products/']").count() >= 1, "home search -> /products?q=pen shows matching products")
    page.goto(SITE + "/products", wait_until="networkidle")
    n_all = page.locator("main .card").count()
    page.get_by_role("link", name="Toys", exact=True).click(); page.wait_for_url("**category=toys*"); page.wait_for_load_state("networkidle")
    ok(0 < page.locator("main .card").count() < n_all, "category chip filters the catalogue")
    page.goto(SITE + "/products?status=out_of_stock", wait_until="networkidle")
    btns = page.locator("main .card button:has-text('Out of Stock')")
    ok(btns.count() > 0 and all(btns.nth(i).is_disabled() for i in range(btns.count())), "out-of-stock products show a disabled button")
    page.goto(SITE + "/products?status=available", wait_until="networkidle")
    href = page.locator("main a[href^='https://wa.me/']").first.get_attribute("href")
    ok(href.startswith("https://wa.me/919876543210?text=Hello%20RK%20Stores%2C%20I%20am%20interested%20in%20"), "WhatsApp link uses the configured number and pre-filled message")
    page.goto(SITE + "/", wait_until="networkidle")
    nav = page.locator("nav[aria-label=Main]")
    ok(nav.is_visible(), "bottom tab bar visible on phone")
    nav.get_by_role("link", name="Categories").click(); page.wait_for_url("**/categories"); page.wait_for_selector("main .card"); page.wait_for_load_state("networkidle")
    ok(page.locator("main .card").count() == 7, "categories page lists all 7 categories")
    nav.get_by_role("link", name="Offers").click(); page.wait_for_url("**/offers"); page.wait_for_selector("main a[href^='/offers/']"); page.wait_for_load_state("networkidle")
    ok(page.locator("main a[href^='/offers/']").count() >= 3, "offers page lists active offers")
    nav.get_by_role("link", name="Search").click(); page.wait_for_url("**/products?search=1"); page.wait_for_load_state("networkidle"); page.wait_for_timeout(300)
    try:
        page.wait_for_function("document.activeElement && document.activeElement.name === 'q'", timeout=3000); focused = True
    except Exception: focused = False
    ok(focused, "Search tab focuses the search box")
    page.goto(SITE + f"/products/{PID(202)}", wait_until="networkidle")
    ok(page.locator("button:has-text('Out of Stock')").is_disabled(), "product detail: out-of-stock button disabled")
    page.goto(SITE + f"/products/{PID(200)}", wait_until="networkidle")
    bar = page.locator("a:has-text('Enquire on WhatsApp')").bounding_box(); nb = nav.bounding_box()
    ok(bar and bar["y"] + bar["height"] <= nb["y"] + 1, "product detail: enquiry button sits above the tab bar")
    page.goto(SITE + "/login", wait_until="networkidle")
    page.get_by_role("tab", name="Register").click()
    ok(page.locator("input[autocomplete=name]").is_visible(), "login: Register tab shows the name field")
    page.get_by_label("Show password").click()
    ok(page.locator("input[placeholder^='Password']").get_attribute("type") == "text", "login: show-password toggle works")
    page.goto(SITE + "/manifest.webmanifest"); m = json.loads(page.inner_text("body"))
    ok(m["display"] == "standalone" and len(m["icons"]) >= 3, "web app manifest is valid and installable")
    r = ctx.request.get(SITE + "/icon-512.png"); ok(r.status == 200 and r.headers["content-type"] == "image/png", "app icons are served")
    r = ctx.request.get(SITE + "/sw.js"); ok(r.status == 200 and "no-cache" in r.headers.get("cache-control", ""), "service worker served with no-cache")
    page.goto(SITE + "/", wait_until="networkidle"); page.wait_for_timeout(1500)
    ok(page.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)"), "service worker registers")
    ctx.close()

    # admin on a phone
    ctx = browser.new_context(**d); ctx.add_cookies([COOKIE]); page = ctx.new_page()
    page.goto(SITE + "/admin/products", wait_until="networkidle")
    ok(page.locator("main ul.md\\:hidden li").count() > 0 and not page.locator("main table").first.is_visible(), "admin products: card list on phone, table hidden")
    box = page.locator("nav[aria-label=Admin]").evaluate("e => e.scrollWidth > e.clientWidth")
    ok(box, "admin nav scrolls horizontally on phone")
    page.locator("details summary", has_text="Add new product").click()
    page.fill("input[name=name]", "Test Product"); page.select_option("select[name=category_id]", index=1)
    page.fill("input[name=price]", "99.5"); page.fill("input[name=quantity]", "7")
    page.get_by_role("button", name="Add product").click(); page.wait_for_url("**/admin/products?msg=*")
    ok("Product added" in page.inner_text("body"), "admin: add product works on phone (server action -> redirect with message)")
    page.fill("input[name=q]", "x"); page.goto(SITE + "/admin/products?new=1")
    page.fill("input[name=name]", ""); page.fill("input[name=price]", "-5"); page.fill("input[name=quantity]", "1")
    ctx.close()

    ctx = browser.new_context(**dict(p.devices["iPad Mini"], **{}) if False else {"viewport": {"width": 1024, "height": 768}}); ctx.add_cookies([COOKIE]); page = ctx.new_page()
    page.goto(SITE + "/admin/products", wait_until="networkidle")
    ok(page.locator("main table").first.is_visible(), "admin products: table shown on tablet landscape/desktop")
    ctx.close(); browser.close()

print(f"\nChecked {checked} page/viewport combinations.")
if problems:
    print(f"{len(problems)} problem(s):")
    from collections import defaultdict
    g = defaultdict(list)
    for k, w, dtl in problems: g[k].append((w, dtl))
    for k, items in g.items():
        print(f"\n== {k}: {len(items)}")
        for w, dtl in items[:12]: print(f"   {w}: {str(dtl)[:230]}")
    sys.exit(1)
print("No layout, tap-target, font-size, overlap or console problems found.")
