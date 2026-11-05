import "server-only";

/** Transactional emails go out from this address (the pixicons.io domain is verified on Resend). Replies reach us. */
const FROM = "Pixicons <hello@pixicons.io>";

/** Send one email through Resend's API. Throws when Resend refuses it. */
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend: HTTP ${res.status} ${await res.text()}`);
}
