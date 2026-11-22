> **Merge note:** these changes are already applied in this project. Section 3 (copying files) only matters if you apply them to a different copy. Sections 4 (Supabase/Gmail setup), 5 (testing) and 6 (rollback) still apply.

# RK Stores – Implementation Guide

Covers **Part 1** (admin Take Photo / Choose Photo) and **Part 3** (email confirmation link flow).
Built against `rkstores_local.zip` (the `rkstores/` project inside it). **No latency code is included** – Part 2 is a separate diagnostic report.

> **Test status, honestly:** this package was written and checked in an environment with no internet, so `npm install`, `npm run typecheck`, `npm run build`, a phone camera, a real Supabase project and a real Gmail account were **not available**. What *was* run is listed in section 5. Everything else is marked **NOT TESTED – you need to do this**, with steps.

---

## 1. Modified files

| File (relative to project root) | New / Updated | What changed |
|---|---|---|
| `components/ImageUpload.tsx` | **Updated** | Two buttons: **Take photo** (`capture="environment"` → rear camera on phones) and **Choose photo** (gallery / file picker). Existing 1200px shrink, 20 MB limit, Supabase Storage upload, preview and Remove button kept. Added: upload errors caught and shown in plain language (offline, permission, missing bucket), same photo can be re-selected after an error, and Save is blocked until an in-progress upload finishes so a product is never saved without its new photo. Used by products, categories, offers, banners, notifications, holidays and store logo, so all of them get both buttons. |
| `components/AuthForm.tsx` | **Updated** | Six-digit code screen removed (`verifyOtp`, code input). New "Check your email" screen after registering: confirmation sent, masked address, inbox/spam hint, **Resend confirmation email**, **Back to log in**. Logging in with an unverified email now shows that screen (no automatic resend – the customer chooses). Redirect `next` checked with the new safe-redirect helper. Google sign-in now always passes a `next`. Login, phone+password registration, Google and forgot-password are otherwise unchanged. |
| `components/ResendVerification.tsx` | **New** | Resend button with 60 s cooldown and error messages (rate limit, SMTP failure, network, already verified). Passes `emailRedirectTo` – the old resend call did not, so Supabase would have sent the customer to the Site URL instead of `/auth/callback`. |
| `app/auth/callback/route.ts` | **Updated** | Validates `next`, passes expired/invalid-link errors to the new page, sends a freshly verified email customer to `/verify-email?status=success`. Password-reset (`?next=/reset-password`) and Google flows keep working. |
| `app/(site)/verify-email/page.tsx` | **New** | Result page: verified (signed in), verified (please log in), expired link, invalid link, unknown. Expired/invalid states offer an email box + resend. Shows fixed messages only; nothing from the URL is echoed. Public page (not in middleware's login list). |
| `lib/mask-email.ts` | **New** | `ra***@gmail.com` style masking. |
| `lib/safe-redirect.ts` | **New** | Only same-site relative paths pass (blocks `//host`, `/\host`, control characters, absolute URLs). |
| `supabase/email-templates/confirm-signup.html` | **New** | Branded email with the **VERIFY EMAIL ADDRESS** button. Not used by the app code – you paste it into the Supabase dashboard (section 4). |
| `IMPLEMENTATION_GUIDE.md` | **New** | This file. Don't copy it into the project unless you want to. |

No database migration. No new environment variables. No new npm packages. `middleware.ts`, `package.json` and all server actions are untouched.

## 2. Folder structure

```
rk-stores-updates.zip
├── IMPLEMENTATION_GUIDE.md
├── app/
│   ├── auth/callback/route.ts
│   └── (site)/verify-email/page.tsx
├── components/
│   ├── AuthForm.tsx
│   ├── ImageUpload.tsx
│   └── ResendVerification.tsx
├── lib/
│   ├── mask-email.ts
│   └── safe-redirect.ts
└── supabase/email-templates/confirm-signup.html
```

The folders match the project root (the folder that contains `package.json`, `app/`, `components/`, `lib/`).

## 3. Where each file goes

I could not see your real `C:\rk-stores`, so don't assume it equals the project root. **Check first:** the project root is the folder that contains `package.json` *and* `app\auth\callback\route.ts`. In the zip you gave me that folder was named `rkstores`. Wherever it is on your PC, call it `<root>` below (it may be `C:\rk-stores` or `C:\rk-stores\rkstores`).

**Before copying, make a backup:** copy the whole `<root>` folder (excluding `node_modules` and `.next`) to e.g. `C:\rk-stores-backup`.

| Copy this | To | Action |
|---|---|---|
| `components\ImageUpload.tsx` | `<root>\components\ImageUpload.tsx` | **Replace** |
| `components\AuthForm.tsx` | `<root>\components\AuthForm.tsx` | **Replace** |
| `components\ResendVerification.tsx` | `<root>\components\ResendVerification.tsx` | **Create** |
| `app\auth\callback\route.ts` | `<root>\app\auth\callback\route.ts` | **Replace** |
| `app\(site)\verify-email\page.tsx` | `<root>\app\(site)\verify-email\page.tsx` | **Create** (make the `verify-email` folder; keep the parentheses in `(site)`) |
| `lib\mask-email.ts` | `<root>\lib\mask-email.ts` | **Create** |
| `lib\safe-redirect.ts` | `<root>\lib\safe-redirect.ts` | **Create** |
| `supabase\email-templates\confirm-signup.html` | `<root>\supabase\email-templates\confirm-signup.html` | **Create** (folder may not exist) |

Easiest: unzip, then drag the `app`, `components`, `lib`, `supabase` folders onto `<root>` and choose "Replace" when Windows asks.

## 4. Configuration (Supabase + Gmail) – you must do these

None of this can be done from code. Names of dashboard menus change over time; if a label differs, look for the closest match.

### 4.1 Gmail App Password
1. The RK Stores Gmail account needs **2-Step Verification** turned on (Google Account → Security).
2. Create an **App password** (Google Account → Security → 2-Step Verification → App passwords). Name it e.g. "Supabase RK Stores".
3. Copy the 16-character password once. **You supply:** the Gmail address and this password. Never paste them into the code or into chat.

### 4.2 Supabase → custom SMTP
Dashboard → your project → **Authentication → Emails → SMTP Settings** (older dashboards: Project Settings → Authentication → SMTP Settings). Turn on **Enable custom SMTP** and enter:

| Field | Value |
|---|---|
| Sender email address | the RK Stores Gmail address (Gmail rewrites other From addresses) |
| Sender name | `RK Stores` |
| Host | `smtp.gmail.com` |
| Port | `465` (your project README also uses 465; if the connection fails try `587`) |
| Username | the full Gmail address |
| Password | the App Password from 4.1 |

Save. Supabase's docs note that custom SMTP is also what unlocks editing email templates, so do this **before** 4.3. After enabling, Supabase's default limit is 30 auth emails per hour (adjustable under Authentication → Rate Limits). Gmail also enforces its own daily sending cap – check Google's current limit for your account type.

### 4.3 Email template + subject
**Authentication → Emails → Templates → Confirm signup**
- **Subject:** `Verify your RK Stores account`
- **Message body:** open `supabase\email-templates\confirm-signup.html`, copy everything, paste it into the body (HTML/source mode), save.
- The button uses `{{ .ConfirmationURL }}` – Supabase generates and validates the token. Don't remove that variable.
- The logo loads from `{{ .SiteURL }}/icon-192.png` (existing project icon). It only shows in the email if **Site URL is a public https address** – on `localhost` the logo appears broken. That's expected while testing locally.

### 4.4 URL configuration
**Authentication → URL Configuration**
- **Site URL:** your live website address (e.g. `https://your-domain`).
- **Redirect URLs:** add `https://<your-live-domain>/auth/callback` and, for testing, `http://localhost:3000/auth/callback`. Registration and resend both send customers to `/auth/callback`; if it isn't allowed, Supabase falls back to the Site URL and the success page won't appear.
- In production, `NEXT_PUBLIC_SITE_URL` in your hosting environment variables should be the same live address (the callback route uses it).

### 4.5 Confirm email + expiry
- **Authentication → Providers (or Sign In / Providers) → Email → Confirm email** must be **ON**.
- Link lifetime = the **Email OTP Expiration** setting (Supabase default 3600 s = 1 hour). The email text says "expires after 1 hour". **Check your value**; if it isn't 3600, edit the sentence "expires after 1 hour" in the template. I can't read your dashboard, so I couldn't confirm yours.

### 4.6 README note
`README.md` step 5 still tells you to add `{{ .Token }}` (a code) to the template. That is now obsolete – use 4.3 instead. I left README untouched.

### 4.7 Existing customers
Already-verified accounts, phone+password accounts and admins are not affected. A customer who registered earlier but never verified will, on their next login attempt, see the new "Check your email" screen and can press Resend.

## 5. Installation and testing

```powershell
cd <root>
npm install
npm run typecheck
npm run build
npm run dev
```

### What was actually run while preparing this package

| Check | Result |
|---|---|
| `npm install`, `npm run typecheck`, `npm run build` | **NOT RUN** (no internet in my environment). Run them yourself. |
| Stand-in type check of the 8 changed TS/TSX files against hand-written stubs for React/Next/Supabase | Passed (0 errors). This catches typos and wrong names only. It is **not** the real project type check. |
| Executed `safeInternalPath` (11 cases incl. `//evil.com`, `/\evil.com`, tab/newline tricks, `javascript:`) and `maskEmail` (4 cases) | All passed |
| Everything else (UI, camera, upload, email, links) | **NOT TESTED** |

### Your test checklist

| # | Test | How | Pass looks like | If it fails |
|---|---|---|---|---|
| 1 | Type check + build | commands above | no errors | send me the first error lines |
| 2 | Choose photo (desktop) | `/admin/products` → Add new product → **Choose photo** | file picker opens, preview shows, Save stores the image | red message under the buttons says why |
| 3 | Take photo (phone) | open the site on a phone **over https** (the live site; plain `http://` PC address often blocks camera), admin login, Add product → **Take photo** | rear camera opens; after shooting, preview appears | iPhone/Android permission prompt denied → allow camera for the browser |
| 4 | Edit product photo | open an existing product → Change photo → Save | new image shows on product list and shop | if old image remains, tell me |
| 5 | Save during upload | pick a big photo and press Save immediately | browser says "Please wait until the photo finishes uploading" | – |
| 6 | Register by email | `/login` → Register with a real inbox | "Confirmation email sent" screen with masked address | error text under the form |
| 7 | Email arrives | check inbox and spam | From "RK Stores", subject "Verify your RK Stores account", big VERIFY EMAIL ADDRESS button | nothing arrives → Supabase Logs (Authentication) show SMTP errors; re-check 4.2 |
| 8 | Click the button (same browser) | click | lands on "Email verified" and you're signed in | lands on Site URL instead → fix 4.4 |
| 9 | Click the button on a different device/browser than you registered in | click | "Email verified – please log in" | – |
| 10 | Expired / reused link | click the same link a second time (or wait out expiry) | "This link has expired" page with resend box | shows "Verification status unknown" instead → tell me; it means the browser dropped the error fragment |
| 11 | Resend | on the pending screen after 60 s | green "new confirmation email" message, new email arrives | red message explains rate-limit or SMTP failure |
| 12 | Login before verifying | register, don't verify, try to log in | pending screen with the "please verify" notice | – |
| 13 | Login after verifying | log in | goes to shop; `/account` works | – |
| 14 | Regression | phone+password register/login, Google login, forgot-password email link, admin login, existing customer account page | all behave as before | tell me which |

## 6. Rollback
- Restore the backup folder you made in section 3: copy `AuthForm.tsx`, `ImageUpload.tsx` and `app\auth\callback\route.ts` back from it.
- Delete the new files: `components\ResendVerification.tsx`, `app\(site)\verify-email\`, `lib\mask-email.ts`, `lib\safe-redirect.ts`.
- If you already pasted the new email template and want the old code-based flow back, restore Supabase's default "Confirm signup" template (Templates page) – otherwise the old code screen would again mismatch the email.
- No database changes were made, so nothing to undo there.
