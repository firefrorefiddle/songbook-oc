import { env } from "$env/dynamic/private";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { prisma } from "./prisma";

type EmailTemplate = "invite" | "password_reset";
type EmailTransport = "log" | "sendmail";

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
}

interface InviteEmailInput {
  inviteId: string;
  toEmail: string;
  signupUrl: string;
  expiresAt: Date;
  invitedByName?: string | null;
  requireEmailVerification: boolean;
}

interface PasswordResetEmailInput {
  passwordResetTokenId: string;
  toEmail: string;
  resetUrl: string;
  expiresAt: Date;
  userDisplayName?: string | null;
}

interface SendEmailResult {
  status: "SENT" | "FAILED";
  transport: EmailTransport;
  providerMessageId?: string;
  errorMessage?: string;
}

function getEmailTransport(): EmailTransport {
  return env.EMAIL_TRANSPORT === "sendmail" ? "sendmail" : "log";
}

function getFromAddress() {
  return env.EMAIL_FROM?.trim() || "Songbook <no-reply@songbook.local>";
}

function getLogDirectory() {
  return env.EMAIL_LOG_DIR?.trim() || path.join("storage", "emails");
}

function getSendmailCommand() {
  return env.EMAIL_SENDMAIL_COMMAND?.trim() || "sendmail";
}

function sanitiseFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function buildRawMessage(message: EmailMessage) {
  return [
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text,
    "",
  ].join("\n");
}

async function logEmail(message: EmailMessage) {
  const logDir = getLogDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}-${sanitiseFilePart(message.to)}.eml`;
  const fullPath = path.join(logDir, filename);

  await mkdir(logDir, { recursive: true });
  await writeFile(fullPath, buildRawMessage(message), "utf8");

  return { providerMessageId: fullPath };
}

async function sendViaSendmail(message: EmailMessage) {
  const rawMessage = buildRawMessage(message);
  const command = getSendmailCommand();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, ["-t", "-i"], {
      stdio: ["pipe", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `sendmail exited with code ${code}`));
    });

    child.stdin.write(rawMessage);
    child.stdin.end();
  });

  return { providerMessageId: randomUUID() };
}

async function dispatchEmail(message: EmailMessage): Promise<{
  transport: EmailTransport;
  providerMessageId?: string;
}> {
  const transport = getEmailTransport();

  if (transport === "sendmail") {
    const result = await sendViaSendmail(message);
    return { transport, providerMessageId: result.providerMessageId };
  }

  const result = await logEmail(message);
  return { transport, providerMessageId: result.providerMessageId };
}

export function resolvePublicBaseUrl(origin: string) {
  const configured = env.APP_BASE_URL?.trim();
  const baseUrl = configured || origin;
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function buildInviteSignupUrl(baseUrl: string, token: string, email: string) {
  const url = new URL("/signup", baseUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}

export function buildPasswordResetUrl(baseUrl: string, token: string) {
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function buildInviteEmail(input: Omit<InviteEmailInput, "inviteId" | "toEmail">) {
  const inviterLine = input.invitedByName
    ? `${input.invitedByName} invited you to join Songbook.`
    : "You were invited to join Songbook.";
  const verificationLine = input.requireEmailVerification
    ? "After opening the signup link, verify your email address before creating your account."
    : "Open the signup link to create your account.";
  const expiresLine = `This invite expires on ${input.expiresAt.toLocaleString("en-GB")}.`;

  return {
    subject: "Your Songbook invitation",
    text: [
      inviterLine,
      "",
      verificationLine,
      expiresLine,
      "",
      input.signupUrl,
    ].join("\n"),
  };
}

export function buildPasswordResetEmail(
  input: Omit<PasswordResetEmailInput, "passwordResetTokenId" | "toEmail">,
) {
  const greeting = input.userDisplayName
    ? `Hello ${input.userDisplayName},`
    : "Hello,";
  const expiresLine = `This reset link expires on ${input.expiresAt.toLocaleString("en-GB")}.`;

  return {
    subject: "Reset your Songbook password",
    text: [
      greeting,
      "",
      "We received a request to reset your Songbook password.",
      "Open the link below to choose a new password.",
      expiresLine,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      input.resetUrl,
    ].join("\n"),
  };
}

async function sendTrackedEmail(input: {
  template: EmailTemplate;
  toEmail: string;
  subject: string;
  text: string;
  metadata: string;
  inviteId?: string;
  passwordResetTokenId?: string;
}): Promise<SendEmailResult> {
  const from = getFromAddress();
  const delivery = await prisma.emailDelivery.create({
    data: {
      template: input.template,
      toEmail: input.toEmail,
      fromEmail: from,
      subject: input.subject,
      transport: getEmailTransport(),
      metadata: input.metadata,
      inviteId: input.inviteId,
      passwordResetTokenId: input.passwordResetTokenId,
    },
  });

  try {
    const dispatch = await dispatchEmail({
      from,
      to: input.toEmail,
      subject: input.subject,
      text: input.text,
    });

    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        transport: dispatch.transport,
        providerMessageId: dispatch.providerMessageId,
        sentAt: new Date(),
      },
    });

    return {
      status: "SENT",
      transport: dispatch.transport,
      providerMessageId: dispatch.providerMessageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email delivery failure";

    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    return {
      status: "FAILED",
      transport: getEmailTransport(),
      errorMessage,
    };
  }
}

export async function sendInviteEmail(input: InviteEmailInput): Promise<SendEmailResult> {
  const rendered = buildInviteEmail(input);

  return sendTrackedEmail({
    template: "invite",
    toEmail: input.toEmail,
    subject: rendered.subject,
    text: rendered.text,
    inviteId: input.inviteId,
    metadata: JSON.stringify({
      signupUrl: input.signupUrl,
      expiresAt: input.expiresAt.toISOString(),
      requireEmailVerification: input.requireEmailVerification,
    }),
  });
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<SendEmailResult> {
  const rendered = buildPasswordResetEmail(input);

  return sendTrackedEmail({
    template: "password_reset",
    toEmail: input.toEmail,
    subject: rendered.subject,
    text: rendered.text,
    passwordResetTokenId: input.passwordResetTokenId,
    metadata: JSON.stringify({
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt.toISOString(),
    }),
  });
}
