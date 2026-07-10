import { redirect } from "next/navigation";

export default function SessionsPage() {
  redirect("/account/security#signed-in-devices");
}
