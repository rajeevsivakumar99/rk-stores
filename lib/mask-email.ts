/** "ravi.kumar@gmail.com" -> "ra***@gmail.com". Shown on the "check your inbox" screen so the customer can spot a typo without the full address sitting on screen. */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, local.length > 2 ? 2 : 1)}***@${domain}`;
}
