import { z } from 'zod';

/** Téléphone guinéen : 9 chiffres, avec ou sans indicatif +224 / 00224. */
const telephone = z
  .string()
  .transform((v) => v.replace(/\D/g, '').replace(/^(00)?224/, ''))
  .refine((v) => /^\d{9}$/.test(v), 'Numéro à 9 chiffres attendu.')
  .transform((v) => `+224${v}`);

const texte = (max: number) => z.string().trim().min(1, 'Champ requis.').max(max);

const commun = {
  telephone,
  quartier: texte(80),
  consentement_contact: z.literal(true, { error: 'Consentement requis.' }),
  consentement_promotion: z.boolean().default(false),
  consentement_version: texte(40),
  consentement_date: z.iso.datetime(),
  site_web: z.string().max(0).optional(), // piège anti-robot : doit rester vide
};

const SERVICES = ['Colis', 'Documents', 'Repas', 'Achats', 'Marchandises'] as const;

export const inscriptionSchema = z.discriminatedUnion('profil', [
  z.object({
    profil: z.literal('client'),
    prenom: texte(60),
    // le formulaire envoie « Colis, Repas » : on le transforme en liste contrôlée
    services: z
      .string()
      .optional()
      .transform((v) => (v ? v.split(',').map((s) => s.trim()) : []))
      .pipe(z.array(z.enum(SERVICES)).max(SERVICES.length)),
    ...commun,
  }),
  z.object({
    profil: z.literal('partenaire'),
    etablissement: texte(100),
    type: z.enum(['Restaurant', 'Commerce', 'Autre']),
    contact: texte(80),
    volume: z.enum(['', 'Moins de 10', '10 à 30', '30 à 100', 'Plus de 100']).default(''),
    ...commun,
  }),
  z.object({
    profil: z.literal('livreur'),
    prenom: texte(60),
    nom: texte(60),
    vehicule: z.enum(['Moto', 'Voiture']),
    permis: z.enum(['Oui', 'Non']),
    majeur: z.literal('oui', { error: 'Les livreurs doivent avoir 18 ans ou plus.' }),
    ...commun,
  }),
]);

export type Inscription = z.infer<typeof inscriptionSchema>;
export type Profil = Inscription['profil'];

export const PROFIL_LABEL: Record<Profil, string> = {
  client: 'Client (liste d’attente)',
  partenaire: 'Restaurant / commerce partenaire',
  livreur: 'Livreur',
};
