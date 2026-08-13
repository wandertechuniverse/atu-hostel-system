import { getSession } from "@/lib/auth";
import type { InboxItem } from "@/lib/notification-types";
import { listMyNotifications } from "@/lib/services/notifications";
import { NotificationBell } from "@/components/notifications/notification-bell";

/** Header inbox. Renders nothing for anonymous visitors. */
export async function NotificationMenu() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;

  let inbox: { items: InboxItem[]; unreadCount: number };
  try {
    inbox = await listMyNotifications(session.userId);
  } catch {
    // A missing table on a stale deploy must not take down the header.
    return null;
  }

  return (
    <NotificationBell
      items={inbox.items}
      unreadCount={inbox.unreadCount}
      isAdmin={session.role === "ADMIN"}
    />
  );
}
