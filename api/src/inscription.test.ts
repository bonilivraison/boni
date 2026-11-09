import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inscriptionSchema } from './inscription/schema.ts';
import { cellule, enregistrer } from './inscription/store.ts';
import { composer } from './inscription/mailer.ts';
import { creerLimiteur } from './rate-limit.ts';

const consent = {
  consentement_contact: true,
  consentement_promotion: false,
  consentement_version: '2026-11-09-v1',
  consentement_date: '2026-11-09T10:00:00.000Z',
};

const livreur = {
  profil: 'livreur',
  prenom: 'Mariama',
  nom: 'Camara',
  telephone: '620 12 34 56',
  quartier: 'Kipé',
  vehicule: 'Moto',
  permis: 'Oui',
  majeur: 'oui',
  ...consent,
};

describe('schéma d’inscription', () => {
  it('accepte un livreur valide et normalise le téléphone', () => {
    const r = inscriptionSchema.parse(livreur);
    expect(r.telephone).toBe('+224620123456');
  });

  it('accepte un numéro saisi avec l’indicatif', () => {
    expect(inscriptionSchema.parse({ ...livreur, telephone: '+224 620-12-34-56' }).telephone).toBe('+224620123456');
  });

  it('refuse un numéro trop court', () => {
    expect(inscriptionSchema.safeParse({ ...livreur, telephone: '62012' }).success).toBe(false);
  });

  it('refuse sans consentement de recontact', () => {
    expect(inscriptionSchema.safeParse({ ...livreur, consentement_contact: false }).success).toBe(false);
  });

  it('refuse un livreur non majeur', () => {
    const { majeur: _m, ...sans } = livreur;
    expect(inscriptionSchema.safeParse(sans).success).toBe(false);
  });

  it('refuse un profil inconnu', () => {
    expect(inscriptionSchema.safeParse({ ...livreur, profil: 'admin' }).success).toBe(false);
  });

  it('transforme les services client en liste contrôlée', () => {
    const r = inscriptionSchema.parse({ profil: 'client', prenom: 'Aly', telephone: '621000000', quartier: 'Dixinn', services: 'Colis, Repas', ...consent });
    expect(r.profil === 'client' && r.services).toEqual(['Colis', 'Repas']);
    expect(inscriptionSchema.safeParse({ profil: 'client', prenom: 'Aly', telephone: '621000000', quartier: 'Dixinn', services: 'Armes', ...consent }).success).toBe(false);
  });

  it('accepte un partenaire sans volume', () => {
    const r = inscriptionSchema.parse({ profil: 'partenaire', etablissement: 'Chez Fanta', type: 'Restaurant', contact: 'Fanta', telephone: '622000000', quartier: 'Matam', ...consent });
    expect(r.profil === 'partenaire' && r.volume).toBe('');
  });
});

describe('export CSV', () => {
  it('neutralise les formules et échappe les séparateurs', () => {
    expect(cellule('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(cellule('a;b')).toBe('"a;b"');
    expect(cellule(['Colis', 'Repas'])).toBe('Colis, Repas');
    expect(cellule(undefined)).toBe('');
  });

  it('écrit l’en-tête une seule fois puis une ligne par inscription', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'boni-'));
    const i = inscriptionSchema.parse(livreur);
    const fichier = await enregistrer(i, dir, new Date('2026-11-09T10:00:00Z'));
    await enregistrer(i, dir, new Date('2026-11-09T10:05:00Z'));
    const lignes = (await readFile(fichier, 'utf8')).trimEnd().split('\n');
    expect(lignes).toHaveLength(3);
    expect(lignes[0].startsWith('﻿date_reception;profil')).toBe(true);
    expect(lignes[1]).toContain('Mariama;Camara');
  });
});

describe('e-mail de notification', () => {
  it('échappe le HTML saisi', () => {
    const i = inscriptionSchema.parse({ ...livreur, prenom: '<script>x</script>' });
    const { html, subject } = composer(i);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(subject).toContain('Livreur');
  });
});

describe('limiteur', () => {
  it('bloque au-delà du maximum dans la fenêtre, puis libère', () => {
    const ok = creerLimiteur(2, 1000);
    expect([ok('ip', 0), ok('ip', 10), ok('ip', 20)]).toEqual([true, true, false]);
    expect(ok('ip', 1500)).toBe(true);
    expect(ok('autre', 20)).toBe(true);
  });
});

describe('export CSV des téléphones', () => {
  it('laisse un numéro international intact', () => {
    expect(cellule('+224620123456')).toBe('+224620123456');
    expect(cellule('+SUM(1)')).toBe("'+SUM(1)");
  });
});
