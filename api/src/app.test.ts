import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configDepuisEnv, creerApp, etatStockage, ipClient, type Config } from './app.ts';

const SITE = 'https://bonilivraison.github.io';
const corps = {
  profil: 'client',
  prenom: 'Aly',
  telephone: '621 00 00 00',
  quartier: 'Dixinn',
  services: 'Colis',
  consentement_contact: true,
  consentement_promotion: false,
  consentement_version: 'v1',
  consentement_date: '2026-11-09T10:00:00.000Z',
};

async function app(extra: Partial<Config> = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'boni-api-'));
  const notifier = vi.fn().mockResolvedValue(undefined);
  const traiter = creerApp({ origines: [SITE], dataDir, maxParFenetre: 5, fenetreMs: 60_000, ...extra }, notifier);
  return { traiter, notifier, dataDir };
}

const post = (body: unknown, origin: string | null = SITE) =>
  new Request('http://api.local/api/inscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  });

describe('API inscription', () => {
  it('enregistre, notifie et renvoie les en-têtes CORS du site', async () => {
    const { traiter, notifier, dataDir } = await app();
    const res = await traiter(post(corps), '1.1.1.1');
    expect(res.status).toBe(201);
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(notifier).toHaveBeenCalledOnce();
    expect(await readdir(dataDir)).toEqual(['inscriptions-client.csv']);
  });

  it('répond au pré-vol CORS pour le site et le refuse aux autres', async () => {
    const { traiter } = await app();
    const pre = (o: string) => new Request('http://api.local/api/inscription', { method: 'OPTIONS', headers: { Origin: o } });
    const ok = await traiter(pre(SITE), 'x');
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-headers')).toBe('Content-Type');
    const ko = await traiter(pre('https://evil.example'), 'x');
    expect(ko.status).toBe(403);
    expect(ko.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('refuse une origine inconnue ou absente', async () => {
    const { traiter, notifier } = await app();
    expect((await traiter(post(corps, 'https://evil.example'), 'x')).status).toBe(403);
    expect((await traiter(post(corps, null), 'x')).status).toBe(403);
    expect(notifier).not.toHaveBeenCalled();
  });

  it('renvoie 422 avec les champs en erreur', async () => {
    const { traiter } = await app();
    const res = await traiter(post({ ...corps, telephone: '12' }), 'x');
    expect(res.status).toBe(422);
    expect((await res.json()).champs).toContain('telephone');
  });

  it('ignore silencieusement un robot', async () => {
    const { traiter, notifier, dataDir } = await app();
    expect((await traiter(post({ ...corps, site_web: 'spam' }), 'x')).status).toBe(200);
    expect(notifier).not.toHaveBeenCalled();
    expect(await readdir(dataDir)).toEqual([]);
  });

  it('limite le nombre d’envois par IP', async () => {
    const { traiter } = await app({ maxParFenetre: 2 });
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await traiter(post(corps), '9.9.9.9')).status);
    expect(codes).toEqual([201, 201, 429]);
  });

  it('expose /health et refuse les autres routes et méthodes', async () => {
    const { traiter } = await app();
    expect((await traiter(new Request('http://api.local/health'), 'x')).status).toBe(200);
    expect((await traiter(new Request('http://api.local/autre'), 'x')).status).toBe(404);
    expect((await traiter(new Request('http://api.local/api/inscription'), 'x')).status).toBe(405);
  });
});

describe('IP du client', () => {
  it('ignore X-Forwarded-For sans proxy de confiance', () => {
    expect(ipClient('6.6.6.6', '10.0.0.1', false)).toBe('10.0.0.1');
  });
  it('prend la dernière entrée, ajoutée par le proxy, et non celle falsifiable du client', () => {
    expect(ipClient('6.6.6.6, 41.77.1.2', '10.0.0.1', true)).toBe('41.77.1.2');
    expect(ipClient(['6.6.6.6', '41.77.1.2'], '10.0.0.1', true)).toBe('41.77.1.2');
  });
  it("revient à l'adresse de la connexion si l'en-tête est absent", () => {
    expect(ipClient(undefined, '10.0.0.1', true)).toBe('10.0.0.1');
    expect(ipClient(undefined, undefined, true)).toBe('inconnue');
  });
});

describe('configuration', () => {
  it('résout DATA_DIR depuis APP_HOME (Clever Cloud)', () => {
    expect(configDepuisEnv({ APP_HOME: '/home/bas/app_1', DATA_DIR: 'data' }).dataDir).toBe('/home/bas/app_1/data');
  });
  it('garde un DATA_DIR absolu tel quel', () => {
    expect(configDepuisEnv({ APP_HOME: '/home/bas/app_1', DATA_DIR: '/data' }).dataDir).toBe('/data');
  });
  it('lit les origines autorisées', () => {
    expect(configDepuisEnv({ ALLOWED_ORIGINS: 'https://a.io, https://b.io' }).origines).toEqual(['https://a.io', 'https://b.io']);
  });
});

describe('état du stockage', () => {
  it('compte les inscriptions sans exposer de données', async () => {
    const { traiter, dataDir } = await app();
    await traiter(post(corps), '1.2.3.4');
    const etat = await etatStockage(dataDir);
    expect(etat).toContain('inscriptions-client.csv=1');
    expect(etat).not.toContain('Aly');
  });
  it('signale un dossier absent', async () => {
    expect(await etatStockage('/chemin/inexistant/data')).toContain('pas encore créé');
  });
});
