import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/auth/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      phone: true,
      department: true,
      studentIdNumber: true,
      role: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your contact details. Password changes use a separate form.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>
            Role: {user.role.toLowerCase()} · email is read-only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" />
            Security
          </CardTitle>
          <CardDescription>
            Change your password if you think someone else may know it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/change-password"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Change password →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
