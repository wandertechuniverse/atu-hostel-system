import "server-only";

import {
  describeMailer,
  describeMailtrap,
  mailtrapTemplateUuid,
  type TemplateVariables,
} from "@/lib/email-templates";

export { describeMailtrap, mailtrapTemplateUuid };

export function mailtrapApiReady(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.MAILTRAP_API_TOKEN?.trim());
}

function parseFrom(raw: string): { email: string; name?: string } {
  const match = raw.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "");
    return { email: match[2].trim(), name: name || undefined };
  }
  return { email: raw.trim() };
}

function sendUrl(env: NodeJS.ProcessEnv): string {
  const inbox = env.MAILTRAP_INBOX_ID?.trim();
  if (inbox) {
    return `https://sandbox.api.mailtrap.io/api/send/${inbox}`;
  }
  return "https://send.api.mailtrap.io/api/send";
}

/**
 * Send a Mailtrap-hosted template (Handlebars {{merge_tag}} vars).
 * Uses the sandbox send API when MAILTRAP_INBOX_ID is set.
 */
export async function sendMailtrapTemplate(
  opts: {
    to: string[];
    templateUuid: string;
    variables?: TemplateVariables;
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const token = env.MAILTRAP_API_TOKEN?.trim();
  if (!token) {
    throw new Error("MAILTRAP_API_TOKEN is not set.");
  }
  const to = opts.to.map((email) => ({ email })).filter((r) => r.email);
  if (to.length === 0) return;

  const res = await fetch(sendUrl(env), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Token": token,
    },
    body: JSON.stringify({
      from: parseFrom(describeMailer(env).from),
      to,
      template_uuid: opts.templateUuid,
      template_variables: opts.variables ?? {},
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Mailtrap template send failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }
}
