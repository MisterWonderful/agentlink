import { redirect } from "next/navigation";

/**
 * Home page - redirects to agents list
 * 
 * This is the entry point for authenticated users.
 * Redirects to the agents page where users can see their
 * configured AI agents and start conversations.
 */
export default function HomePage(): never {
  redirect("/agents");
}
