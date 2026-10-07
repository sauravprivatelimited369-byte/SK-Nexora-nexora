import 'server-only';

export async function sendActionEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email delivery is not configured.');
    console.info(`[nexora:dev-email] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'NEXORA <no-reply@example.com>',
    to,
    subject,
    text,
    html,
  });
}

export function appUrl(pathname: string, request?: Request): string {
  const forwardedHost = request?.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request?.headers.get('host') || (request ? new URL(request.url).host : 'localhost:3000');
  const protocol = request?.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || (request ? new URL(request.url).protocol.replace(':', '') : 'http');
  const base = (process.env.APP_URL?.trim() || `${protocol}://${host}`).replace(/\/$/, '');
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
