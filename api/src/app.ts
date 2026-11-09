import path from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { inscriptionSchema } from './inscription/schema.ts';
import { enregistrer } from './inscription/store.ts';
import { notifier } from './inscription/mailer.ts';
import { creerLimiteur } from './rate-limit.ts';

export interface Config {
  /** Origines autorisées (CORS + contrôle d'origine). Vide = toutes (développement uniquement). */
  origines: string[];
  dataDir: string;
  maxParFenetre: number;
  fenetreMs: number;
}

/**
 * IP du client pour la limitation d'envois.
 * Derrière un proxy de confiance (Clever Cloud, Caddy), on lit la DERNIÈRE entrée de X-Forwarded-For :
 * c'est celle ajoutée par le proxy. Les précédentes viennent du client et peuvent être falsifiées.
 */
export function ipClient(xff: string | string[] | undefined, distante: string | undefined, trustProxy: boolean): string {
  if (trustProxy && xff) {
    const derniere = (Array.isArray(xff) ? xff.join(',') : xff).split(',').map((s) => s.trim()).filter(Boolean).at(-1);
    if (derniere) return derniere;
  }
  return distante || 'inconnue';
}

/**
 * Résumé du stockage pour les journaux de démarrage, sans aucune donnée personnelle :
 * volume monté ou non (FS Bucket), et nombre d'inscriptions par fichier.
 */
export async function etatStockage(dossier: string): Promise<string> {
  try {
    const [d, parent] = await Promise.all([stat(dossier), stat(path.dirname(dossier))]);
    const monte = d.dev !== parent.dev;
    const fichiers = (await readdir(dossier)).filter((f) => f.endsWith('.csv')).sort();
    const comptes = await Promise.all(
      fichiers.map(async (f) => {
        const lignes = (await readFile(path.join(dossier, f), 'utf8')).split('\n').filter(Boolean).length;
        return `${f}=${Math.max(0, lignes - 1)}`;
      }),
    );
    return `${dossier} · volume monté : ${monte ? 'oui' : 'non'} · ${comptes.join(', ') || 'aucune inscription'}`;
  } catch {
    return `${dossier} · pas encore créé`;
  }
}

export function configDepuisEnv(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    origines: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    // Relatif : résolu depuis APP_HOME (racine de l'app sur Clever Cloud, où est monté le FS Bucket), sinon le dossier courant.
    dataDir: path.resolve(env.APP_HOME ?? process.cwd(), env.DATA_DIR ?? 'data'),
    maxParFenetre: Number(env.RATE_LIMIT_MAX ?? 5),
    fenetreMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000),
  };
}

const MAX_OCTETS = 8 * 1024;

/**
 * Cœur HTTP de l'API, en Request/Response standard (testable sans serveur).
 * `notifierFn` est injectable pour les tests.
 */
export function creerApp(config: Config, notifierFn: typeof notifier = notifier) {
  const autorise = creerLimiteur(config.maxParFenetre, config.fenetreMs);

  const origineOk = (o: string | null) => !config.origines.length || (!!o && config.origines.includes(o));

  const entetes = (origine: string | null): Record<string, string> => ({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
    ...(origine && origineOk(origine)
      ? {
          'Access-Control-Allow-Origin': origine,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      : {}),
  });

  return async function traiter(request: Request, ip: string): Promise<Response> {
    const url = new URL(request.url);
    const origine = request.headers.get('origin');
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: entetes(origine) });

    if (url.pathname === '/health') return json(200, { ok: true });
    if (url.pathname !== '/api/inscription') return json(404, { ok: false });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: origineOk(origine) ? 204 : 403, headers: entetes(origine) });
    }
    if (request.method !== 'POST') return json(405, { ok: false });
    if (config.origines.length && !origineOk(origine)) return json(403, { ok: false, error: 'origine' });
    if (!request.headers.get('content-type')?.includes('application/json')) return json(415, { ok: false });
    if (Number(request.headers.get('content-length') ?? 0) > MAX_OCTETS) return json(413, { ok: false });
    if (!autorise(ip)) return json(429, { ok: false, error: 'trop_de_demandes' });

    let brut: unknown;
    try {
      const texte = await request.text();
      if (texte.length > MAX_OCTETS) return json(413, { ok: false });
      brut = JSON.parse(texte);
    } catch {
      return json(400, { ok: false, error: 'json' });
    }

    // Robot : on répond « ok » sans rien faire, pour ne pas le renseigner.
    if (typeof brut === 'object' && brut && (brut as Record<string, unknown>).site_web) return json(200, { ok: true });

    const res = inscriptionSchema.safeParse(brut);
    if (!res.success) {
      return json(422, { ok: false, error: 'validation', champs: res.error.issues.map((i) => i.path.join('.')) });
    }

    try {
      await enregistrer(res.data, config.dataDir);
    } catch (e) {
      console.error('[inscription] enregistrement impossible', e);
      return json(500, { ok: false });
    }
    // L'inscription est sauvegardée : un e-mail en échec ne doit pas faire échouer la demande.
    notifierFn(res.data).catch((e) => console.error('[inscription] e-mail non envoyé', e));
    return json(201, { ok: true });
  };
}
