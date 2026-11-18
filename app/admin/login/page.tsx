import { redirect } from "next/navigation";

// Admins and customers share one login page. The account's role decides which pages they see.
export default function AdminLogin() { redirect("/login?next=/admin"); }
