"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  markAllReadAction,
  openNotificationAction,
} from "@/lib/actions/notifications";
import type { InboxItem } from "@/lib/notification-types";

function formatWhen(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell({
  items,
  unreadCount,
  isAdmin,
}: {
  items: InboxItem[];
  unreadCount: number;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <span className="relative inline-flex">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <form action={markAllReadAction}>
              <CsrfInput />
              <button
                type="submit"
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Mark all read
              </button>
            </form>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((item) => (
              <li key={item.id}>
                <form action={openNotificationAction}>
                  <CsrfInput />
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      item.readAt ? "opacity-70" : ""
                    }`}
                  >
                    <span className="flex w-full items-center gap-2">
                      {!item.readAt && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-sky-500"
                          aria-hidden
                        />
                      )}
                      <span className="font-medium leading-snug">
                        {item.title}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {item.body}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatWhen(item.createdAt)}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="px-3 py-2">
              <Link
                href="/admin/notifications"
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Email integration and delivery log →
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
