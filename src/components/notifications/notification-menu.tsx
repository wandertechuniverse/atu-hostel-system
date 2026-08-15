import type { InboxItem } from "@/lib/notification-types";
import { listMyNotifications } from "@/lib/services/notifications";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { SessionData } from "@/lib/session";

/** Header inbox. Session is supplied by the shell (no extra cookie/DB auth). */
export async function NotificationMenu({
  userId,
  role,
}: {
  userId: string;
  role: SessionData["role"];
}) {
  let inbox: { items: InboxItem[]; unreadCount: number };
  try {
    inbox = await listMyNotifications(userId);
  } catch {
    // A missing table on a stale deploy must not take down the header.
    return null;
  }

  return (
    <NotificationBell
      items={inbox.items}
      unreadCount={inbox.unreadCount}
      isAdmin={role === "ADMIN"}
    />
  );
}
