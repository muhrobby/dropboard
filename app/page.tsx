import { redirect } from "next/navigation";

export default function Home() {
  // Check if user has session, redirect accordingly
  // This is handled by middleware, but we still need a valid page
  redirect("/dashboard");
}
