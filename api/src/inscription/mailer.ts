import nodemailer, { type Transporter } from 'nodemailer';
import { lisible } from './fields.ts';
import { PROFIL_LABEL, type Inscription } from './schema.ts';

export interface MailConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string[];
}

export function configDepuisEnv(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const port = Number(env.SMTP_PORT ?? 587);
  return {
    host: env.SMTP_HOST || undefined,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    user: env.SMTP_USER || undefined,
    pass: env.SMTP_PASS || undefined,
    from: env.MAIL_FROM || 'BoniLivraison <no-reply@bonilivraison.example>',
    to: (env.MAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

let cache: { key: string; transport: Transporter } | undefined;

/** Sans SMTP_HOST (développement), le message est seulement journalisé, pas envoyé. */
function transport(c: MailConfig): Transporter {
  const key = `${c.host}:${c.port}:${c.user}`;
  if (cache?.key !== key) {
    cache = {
      key,
      transport: c.host
        ? nodemailer.createTransport({
            host: c.host,
            port: c.port,
            secure: c.secure,
            auth: c.user ? { user: c.user, pass: c.pass } : undefined,
          })
        : nodemailer.createTransport({ jsonTransport: true }),
    };
  }
  return cache.transport;
}

const echapper = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export function composer(i: Inscription) {
  const champs = lisible(i);
  const nom = i.profil === 'partenaire' ? i.etablissement : i.prenom;
  const subject = `Nouvelle inscription · ${PROFIL_LABEL[i.profil]} · ${nom} (${i.quartier})`;
  const text = [`${PROFIL_LABEL[i.profil]}`, '', ...champs.map(([k, v]) => `${k} : ${v}`)].join('\n');
  const wa = `https://wa.me/${i.telephone.replace('+', '')}`;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F6EEDF;font-family:Arial,sans-serif;color:#0E1A24">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDF8;border-radius:16px;overflow:hidden">
    <tr><td style="background:#C8371E;color:#F6EEDF;padding:20px 24px;font-size:20px;font-weight:bold">boni<span style="color:#F2B705">livraison</span></td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#AE2D18;font-weight:bold">Nouvelle inscription</p>
      <h1 style="margin:0 0 20px;font-size:22px">${echapper(PROFIL_LABEL[i.profil])}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">
        ${champs
          .map(
            ([k, v]) =>
              `<tr><td style="padding:8px 0;border-bottom:1px solid #EFE3CD;color:#46525C;width:45%">${echapper(k)}</td><td style="padding:8px 0;border-bottom:1px solid #EFE3CD;font-weight:bold">${echapper(v)}</td></tr>`,
          )
          .join('')}
      </table>
      <p style="margin:24px 0 0"><a href="${wa}" style="display:inline-block;background:#0F6B3E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px">Répondre sur WhatsApp</a></p>
    </td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function notifier(i: Inscription, c: MailConfig = configDepuisEnv()) {
  if (!c.to.length) throw new Error('MAIL_TO non configuré');
  const { subject, text, html } = composer(i);
  const info = await transport(c).sendMail({ from: c.from, to: c.to, subject, text, html });
  if (!c.host) console.info('[mail:dev] message non envoyé (SMTP_HOST vide) :', subject);
  return info;
}
