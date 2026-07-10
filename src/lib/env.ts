import "server-only";

export type AppEnvironment = "local" | "test" | "development" | "staging" | "production";

function environment(): AppEnvironment {
  const value = process.env.APP_ENV ?? (process.env.NODE_ENV === "test" ? "test" : "local");
  if (["local", "test", "development", "staging", "production"].includes(value))
    return value as AppEnvironment;
  throw new Error(
    `APP_ENV must be local, test, development, staging or production; received ${value}.`
  );
}

function validUrl(name: string, value: string | undefined, problems: string[]) {
  if (!value) {
    problems.push(`${name} is required`);
    return;
  }
  try {
    new URL(value);
  } catch {
    problems.push(`${name} must be a valid URL`);
  }
}

export function validateRuntimeEnvironment() {
  const appEnvironment = environment();
  if (appEnvironment !== "production" && appEnvironment !== "staging") return { appEnvironment };
  const problems: string[] = [];
  validUrl("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL, problems);
  validUrl("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL, problems);
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");
  if (!process.env.SUPABASE_SECRET_KEY)
    problems.push("SUPABASE_SECRET_KEY is required for queues and server workflows");
  if (!process.env.NOTIFICATION_WORKER_SECRET || process.env.NOTIFICATION_WORKER_SECRET.length < 32)
    problems.push("NOTIFICATION_WORKER_SECRET must contain at least 32 characters");
  if (!process.env.RESEND_API_KEY) problems.push("RESEND_API_KEY is required");
  if (!process.env.RESEND_WEBHOOK_SECRET) problems.push("RESEND_WEBHOOK_SECRET is required");
  if (!process.env.EMAIL_FROM) problems.push("EMAIL_FROM is required");
  if (problems.length)
    throw new Error(`Invalid ${appEnvironment} environment:\n- ${problems.join("\n- ")}`);
  return { appEnvironment };
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
