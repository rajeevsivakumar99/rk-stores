"use server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePhone, phoneToEmail } from "@/lib/util";

const PhoneRegister = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(100),
  phone: z.string().trim().min(1, "Please enter your phone number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export type RegisterResult = { ok: true } | { ok: false; error: string };

/**
 * Phone + password registration with NO SMS / OTP (free).
 * The account is created through Supabase's admin API with a private login address derived from the phone
 * number (see lib/util.ts). The browser then signs in with the same phone + password.
 * Email registrations do not use this: they go through Supabase's normal sign-up + email verification code.
 */
export async function registerWithPhone(input: { full_name: string; phone: string; password: string }): Promise<RegisterResult> {
  const p = PhoneRegister.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };

  const phone = normalizePhone(p.data.phone);
  if (!phone) return { ok: false, error: "Enter a valid phone number (10 digits, or with country code)." };

  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: p.data.password,
    email_confirm: true, // phone accounts are not verified by SMS (free option); the login itself needs the password
    user_metadata: { full_name: p.data.full_name, phone, phone_login: true },
  });

  if (error || !data.user) {
    const m = error?.message ?? "";
    if (/already|exists|registered/i.test(m)) return { ok: false, error: "This phone number is already registered. Please log in." };
    return { ok: false, error: m || "Could not create the account. Please try again." };
  }

  // The profile row is created by a database trigger. Store the real phone number and keep the private login
  // address out of the profile so it is never used for email notifications.
  await db.from("profiles").update({ phone, email: null, full_name: p.data.full_name, updated_at: new Date().toISOString() }).eq("id", data.user.id);
  return { ok: true };
}
