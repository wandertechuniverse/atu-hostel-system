import {
  Bell,
  Inbox,
  Mail,
  Server,
  ShieldAlert,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { describeMailtrap } from "@/lib/email-templates";
import {
  describeMailer,
  listRecentDeliveries,
  NOTIFICATION_EVENTS,
  notificationStats,
} from "@/lib/services/notifications";
import { TestEmailForm } from "@/components/admin/test-email-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function formatTime(iso: Date) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deliveryTone(
  delivery: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (delivery === "failed") return "destructive";
  if (delivery === "sent") return "default";
  if (delivery === "skipped") return "outline";
  return "secondary";
}

export default async function AdminNotificationsPage() {
  const session = await requireRole("ADMIN");

  const [stats, deliveries, actor] = await Promise.all([
    notificationStats(),
    listRecentDeliveries(40),
    db.user.findUnique({
      where: { id: session.userId! },
      select: { email: true },
    }),
  ]);

  const mailer = describeMailer();
  const mailtrap = describeMailtrap();

  const summary = [
    {
      label: "Mailer",
      value: mailer.enabled
        ? mailer.mode === "smtp"
          ? "SMTP"
          : "Console"
        : "Paused",
      icon: Server,
      chip: mailer.mode === "smtp" && mailer.enabled
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Deliveries today",
      value: stats.today.toLocaleString(),
      icon: Mail,
      chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Unread inboxes",
      value: stats.unread.toLocaleString(),
      icon: Inbox,
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Failed sends",
      value: stats.failed.toLocaleString(),
      icon: ShieldAlert,
      chip: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Email integration status, transactional events, and the in-app
          delivery log. SMTP credentials stay in environment variables.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <span className={`rounded-lg p-2 ${card.chip}`} aria-hidden>
                <card.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            Email integration
          </CardTitle>
          <CardDescription>
            Outbound mail uses nodemailer when <code>SMTP_HOST</code> is set.
            Otherwise messages are printed to the server log so local and e2e
            runs need no mailbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Transport</dt>
              <dd className="text-sm font-medium">
                {mailer.mode === "smtp" ? "SMTP" : "Console (log only)"}
                {!mailer.enabled && " · paused"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">From</dt>
              <dd className="truncate text-sm font-medium">{mailer.from}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Host</dt>
              <dd className="text-sm font-medium">
                {mailer.host
                  ? `${mailer.host}:${mailer.port}${mailer.secure ? " (TLS)" : ""}`
                  : "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Authentication</dt>
              <dd className="text-sm font-medium">
                {mailer.hasAuth
                  ? mailer.user
                  : mailer.mode === "smtp"
                    ? "No SMTP_USER / SMTP_PASS"
                    : "Not required"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Public site URL</dt>
              <dd className="truncate text-sm font-medium">{mailer.siteUrl}</dd>
            </div>
          </dl>

          <TestEmailForm defaultTo={actor?.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mailtrap email templates</CardTitle>
          <CardDescription>
            Design HTML in Mailtrap (Handlebars {"{{studentName}}"} tags).
            Bind each event to a template UUID. Unset events still use the
            in-repo text/HTML over SMTP or the console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">API token</dt>
              <dd className="text-sm font-medium">
                {mailtrap.apiConfigured ? "Set" : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Endpoint</dt>
              <dd className="text-sm font-medium">
                {mailtrap.endpoint ?? "Not configured"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Sandbox inbox</dt>
              <dd className="text-sm font-medium">
                {mailtrap.inboxId ?? "Not set (uses sending API)"}
              </dd>
            </div>
          </dl>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Env key</TableHead>
                <TableHead>Template UUID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailtrap.templates.map((row) => (
                <TableRow key={row.event}>
                  <TableCell className="font-mono text-xs">{row.event}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.envKey}
                  </TableCell>
                  <TableCell>
                    {row.uuid ? (
                      <span className="font-mono text-xs">{row.uuid}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        not bound
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            Notification events
          </CardTitle>
          <CardDescription>
            Each event sends email (when enabled) and writes an in-app inbox
            row for matching accounts. Password-reset mail is email-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>When it fires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NOTIFICATION_EVENTS.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.label}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {event.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.audience}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.trigger}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
          <CardDescription>
            {stats.total.toLocaleString()} recorded notification
            {stats.total === 1 ? "" : "s"} · latest {deliveries.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No notifications have been recorded yet. Approve a booking
                    or send a test email to see a row here.
                  </TableCell>
                </TableRow>
              )}
              {deliveries.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatTime(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.emailTo ?? row.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={deliveryTone(row.delivery)}>
                      {row.delivery}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
