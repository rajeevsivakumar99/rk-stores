# RK Stores – Catalogue, Inventory & Store Management

Next.js 14 (App Router, TypeScript, Tailwind) + Supabase (Postgres, Auth, Storage, Realtime).
Customers browse products, see prices/stock, add items to a cart and send the order on WhatsApp. Admins manage everything. There is **no online payment** (it was removed on purpose; see "Payments" at the end).

## Quick start on Windows
1. Double-click **`setup.bat`** (one time). It checks Node.js, creates `.env.local`, runs `npm install`, generates the cron secret and push keys, and creates a Python venv (`.venv`) with the test requirements (`tests/requirements.txt`).
2. Paste your 3 Supabase values into `.env.local` (setup opens Notepad if they are missing) and do the Supabase steps below (section 2).
3. Double-click **`start.bat`**. It starts the site in its own terminal window (plus a second window with the Python venv activated, for the tests) and opens http://localhost:3000.

Only **one** terminal is needed: the Next.js server runs the website, the admin panel and the API together. Supabase is hosted online, so there is no local database to start.

## What is included
| Area | Where |
|---|---|
| Customer site (home, catalogue, filters, product & offer pages, cart, account, notifications inbox) | `app/(site)/` |
| One login / register page for customers and admins | `components/AuthForm.tsx`, `app/(site)/login/` |
| Admin panel (dashboard, products, categories, offers, holidays, notifications, settings & timings) | `app/admin/` |
| Server actions (all validated with zod, admin-only) | `app/admin/actions.ts`, `app/actions.ts` |
| Notification engine (in-app + Gmail email + web push, delivery tracking, de-duplication) | `lib/notify.ts`, `lib/email.ts` |
| Closing-time scheduler endpoint | `lib/scheduler.ts`, `app/api/cron/closing/route.ts` |
| Database schema, RLS policies, storage buckets | `supabase/schema.sql` |
| Mobile/tablet/desktop tests (fake backend + headless browser) | `tests/` |

## 1. Prerequisites
Node.js 18.17+ and a free Supabase account.

## 2. Supabase setup
1. Create a project at supabase.com.
2. **SQL Editor → New query →** paste all of `supabase/schema.sql` → Run. This creates all 13 tables, the 7 categories, price/stock history triggers, security policies, image buckets (`product-images`, `store-assets`) and realtime for notifications.
3. **Project Settings → API:** copy the Project URL, `anon` key and `service_role` key into `.env.local` (step 4).
4. **Authentication → URL Configuration:** set Site URL to your site (`http://localhost:3000` locally) and add `http://localhost:3000/auth/callback` (and your production URL + `/auth/callback`) to Redirect URLs.
5. **Email verification code:** Authentication → Email Templates → **Confirm signup**: add the line `Your verification code is: {{ .Token }}` (keep the link too if you like). Customers who register with an email type this code on the register screen.
6. **Google login (optional):** create OAuth credentials in Google Cloud Console (Web application). Authorized redirect URI = `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. Then Supabase → Authentication → Providers → Google → paste Client ID/Secret and enable.
7. **Auth emails (confirm email / password reset):** Supabase's built-in sender is heavily rate-limited. Under Authentication → SMTP Settings, enable custom SMTP with host `smtp.gmail.com`, port `465`, your Gmail address and the same App Password.

## 3. Gmail App Password
Google Account → Security → turn on 2-Step Verification → search "App passwords" → create one named "RK Stores". Put it in `GMAIL_APP_PASSWORD`. Personal Gmail allows about 500 emails/day.

## 4. Configure and run
```bash
cp .env.example .env.local      # then fill in every value
npx web-push generate-vapid-keys   # paste into the VAPID variables
npm install
npm run dev                      # http://localhost:3000
```
Windows PowerShell: `Copy-Item .env.example .env.local`.

## 4b. How login works (one page for everyone)
- **Log in:** one box for *email or phone number* + password. Admins use the same page; after login the account's `role` decides what they see (admins get the **Admin** button and land on `/admin`; customers see only the shop). `/admin/login` simply redirects to `/login`.
- **Register with email:** Supabase emails a verification code; the customer types it on the screen.
- **Register with phone:** phone number + password, **no SMS and no cost**. The number is not verified by SMS. (SMS verification needs a paid provider such as Twilio; it can be added later.)
- Phone-only accounts have no email, so they cannot use "Forgot password"; ask the store (an admin can reset the password in Supabase → Authentication → Users).

## 5. Create the first admin
1. Open the site → **Login / Register** and create your account (confirm the email if asked).
2. Supabase → SQL Editor (also run `supabase/migrations/002_cart_order_coupon_banner_activity.sql` once, after `schema.sql`):
```sql
update profiles set role = 'super_admin' where email = 'you@example.com';
```
   (For a phone account use `where phone = '919876543210'`.)
3. Log in on the normal login page; the admin panel opens automatically. Everyone else stays a `customer`; customers cannot reach admin pages or write to admin tables (enforced by middleware, server checks and database RLS).
4. Open **Settings** and fill in the WhatsApp number (digits with country code, e.g. `919876543210`), address, contact details, timings and logo. Nothing is hardcoded; the site reads all of this from the database.

## 6. Scheduler for closing reminders
The app exposes `GET /api/cron/closing` (protected by `CRON_SECRET`). Call it **every 5 minutes** from any scheduler. It works out today's closing time (per-day timings, weekly holidays, closures and special hours), sends one reminder inside the window `closing time − advance minutes`, and never sends twice per day.

Pick one:
- **cron-job.org / UptimeRobot** (free): GET `https://YOUR-SITE/api/cron/closing` with header `Authorization: Bearer YOUR_CRON_SECRET` every 5 min.
- **GitHub Actions** (`schedule: cron: "*/5 * * * *"`) running `curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-SITE/api/cron/closing`.
- **Supabase pg_cron + pg_net** calling the same URL with the header.
- Vercel Cron only runs once per day on the free plan, so use one of the options above.

Test manually: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/closing` (it replies with why it skipped or what it sent).

## 7. Deployment (Vercel)
1. Push this folder to GitHub and import it in Vercel.
2. Add every variable from `.env.example` in Project Settings → Environment Variables (set `NEXT_PUBLIC_SITE_URL` to the live URL).
3. Deploy, then add the live URL to Supabase Redirect URLs and set up the scheduler (step 6).
HTTPS is provided by Vercel; browser push requires HTTPS (localhost is exempt).

## 8. Behaviour notes
- **Stock status**: Available = above the threshold, Low Stock = 1 to threshold, Out of Stock = 0. The threshold defaults to 5 and is editable in Settings. Status is computed in the database view, so it always matches the quantity.
- **Offers** become inactive automatically when their end date passes (computed, no job needed).
- **Browsing is public** so visitors can see the catalogue; notifications, profile and push need an account. To require login for browsing, change the `to anon, authenticated` read policies in the schema to `to authenticated`.
- **Notifications**: each announcement picks its channels; delivery rows record per-customer status (`delivered` for in-app, `sent`/`failed` for email and push). A re-run never duplicates because each (notification, customer, channel) is unique. Customers can turn email/push off in **Account**.
- **History**: every price and quantity change is logged with old/new value, time and the admin who made it (shown on each product's edit page).

## 9. Mobile-first design
Designed for phones first (Android + iPhone), then tablets, then desktop.
- **Phones and tablets (under 1024px):** bottom tab bar (Home, Categories, Search, Offers, Account), compact header with notification bell, swipeable category/offer/product rows, 2-column product cards, enquiry button pinned above the tab bar on product pages, filter chips instead of dropdowns.
- **Desktop (1024px and up):** full top navigation and search, grids, tables in admin.
- **Touch rules:** all controls at least 44px tall on touch screens; inputs are 16px so iPhones do not zoom; safe-area insets for notched phones.
- **Admin on a phone:** swipeable section tabs, card lists instead of tables, camera/photo upload that shrinks images to about 1200px before uploading.
- **Fast on mobile networks:** small JavaScript bundles, lazy images, loading skeletons, a service worker that caches app files and product photos, always-fresh data (database responses are never cached by Next.js).
- **Install as an app:** Android Chrome shows "Install app"; on iPhone use Share, then "Add to Home Screen". The app name follows the store name in Settings.

### Automated device tests (optional)
Checks 8 screen sizes x 21 pages for sideways scrolling, small tap targets, small input text, content hidden behind the tab bar, console errors, plus feature smoke tests. It uses a fake backend, so no Supabase is needed.
```bash
npm run build && npx next start -p 3100 &      # set the three Supabase env vars to http://localhost:54321 and any dummy keys
node tests/mock-supabase.mjs &
pip install playwright && python -m playwright install chromium
python tests/responsive_test.py --shots shots   # screenshots go in ./shots
```
These run in Chromium with device emulation. Always also try the site on a real Android phone and iPhone.

## 10. Test checklist
Customer: register, email login, Google login, forgot/reset password, browse, category filter, search, sort, stock badges, WhatsApp button (disabled when out of stock), in-app bell updates live, email received, push received (enable it under Account).
Admin: login, add/edit/delete product, image upload, change price/quantity (check history + status), low-stock alert on dashboard, create offer, send announcement on each channel, change timings, trigger `/api/cron/closing`, update store settings and see the site change.

## 11. Cart and payments
- The **cart** (add, change quantity, remove, clear, stock checks) works for logged-in customers. The cart page has a **Send order on WhatsApp** button that sends the item list and total to the shop's WhatsApp number from Settings.
- **Online payment was removed** (Stripe code, webhook, checkout page and keys). The `orders`, `order_items` and `coupons` tables and their admin pages still exist, but nothing creates orders yet; they are ready for when payments or order saving are added back.
