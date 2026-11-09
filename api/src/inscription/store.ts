import { appendFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Inscription } from './schema.ts';

/**
 * Stockage minimal : une ligne CSV par inscription, un fichier par profil.
 * Ouvrable directement dans Excel / LibreOffice (séparateur « ; », UTF-8 avec BOM).
 */
const COLONNES = [
  'date_reception',
  'profil',
  'prenom',
  'nom',
  'etablissement',
  'type',
  'contact',
  'volume',
  'vehicule',
  'permis',
  'services',
  'telephone',
  'quartier',
  'consentement_promotion',
  'consentement_version',
  'consentement_date',
] as const;

/** Échappe une cellule et neutralise l'injection de formules (=, +, -, @). */
export function cellule(v: unknown): string {
  let s = Array.isArray(v) ? v.join(', ') : v === undefined || v === null ? '' : String(v);
  // Un numéro « +224620… » reste tel quel ; tout autre début à risque est préfixé d'une apostrophe.
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d+$/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ligneCsv(i: Inscription, recuLe: Date): string {
  const record: Record<string, unknown> = { ...i, date_reception: recuLe.toISOString() };
  return COLONNES.map((c) => cellule(record[c])).join(';') + '\n';
}

export async function enregistrer(i: Inscription, dossier: string, recuLe = new Date()): Promise<string> {
  await mkdir(dossier, { recursive: true });
  const fichier = path.join(dossier, `inscriptions-${i.profil}.csv`);
  const existe = await stat(fichier).then(
    () => true,
    () => false,
  );
  if (!existe) await appendFile(fichier, '﻿' + COLONNES.join(';') + '\n', { mode: 0o600 });
  await appendFile(fichier, ligneCsv(i, recuLe));
  return fichier;
}
