import { revalidatePath } from "next/cache";

/** Staff screens exist at both /admin and /manager. */
export function revalidateStaff(suffix = "") {
  const path = !suffix || suffix === "/"
    ? ""
    : suffix.startsWith("/")
      ? suffix
      : `/${suffix}`;
  revalidatePath(`/admin${path}`);
  revalidatePath(`/manager${path}`);
}
