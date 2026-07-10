import "server-only";

import { Resend } from "resend";

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey: string;
  tags?: { name: string; value: string }[];
}

export interface EmailSendResult {
  ok: boolean;
  providerMessageId?: string;
  disabled?: boolean;
  error?: string;
}

function fromAddress(): string | undefined {
  return process.env.EMAIL_FROM;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && fromAddress());
}

function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${line.replace(/[<>&]/g, "")}</p>`)
    .join("");
}

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    return { ok: false, disabled: true, error: "Email is not configured." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    {
      from: fromAddress()!,
      to: [email.to],
      replyTo: process.env.EMAIL_REPLY_TO ? [process.env.EMAIL_REPLY_TO] : undefined,
      subject: email.subject,
      text: email.text,
      html: email.html ?? textToHtml(email.text),
      tags: email.tags,
    },
    { idempotencyKey: email.idempotencyKey }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, providerMessageId: data?.id };
}
