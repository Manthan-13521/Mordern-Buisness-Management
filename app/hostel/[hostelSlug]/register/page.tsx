import { redirect } from "next/navigation";

/**
 * /hostel/[hostelSlug]/register redirects to the unified public registration page.
 * Hostel registration is not slug-specific at sign-up time (no hostelSlug yet).
 */
export default function HostelSlugRegisterPage() {
    redirect("/hostel/register");
}
