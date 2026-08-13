/** Shared inbox row shape - safe for client components (no server-only). */
export type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  emailTo: string | null;
  delivery: string;
  readAt: Date | null;
  createdAt: Date;
};
