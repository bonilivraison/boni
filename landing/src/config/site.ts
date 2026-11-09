/**
 * Informations du porteur de projet.
 * Tout ce qui est marqué TODO doit être fourni et validé AVANT la mise en ligne
 * (voir le rapport de cadrage interne, questions bloquantes 1 et 16).
 */
export const site = {
  name: 'BoniLivraison',
  tagline: 'Conakry, de A à B.',
  description:
    "BoniLivraison arrive bientôt à Conakry : colis, documents, repas et achats livrés à moto ou en voiture, avec le prix affiché avant de confirmer et votre livreur suivi sur la carte.",

  // TODO porteur : numéro WhatsApp au format international, sans + ni espaces (ex. 224620000000).
  whatsapp: '224000000000',
  // TODO porteur : adresse e-mail de contact.
  email: 'contact@bonilivraison.example',
  // TODO porteur : structure juridique (mentions légales, responsable de traitement).
  legal: {
    entity: '[Raison sociale à compléter]',
    form: '[Forme juridique et capital à compléter]',
    rccm: '[N° RCCM à compléter]',
    address: '[Adresse du siège, Conakry, Guinée]',
    director: '[Nom du responsable de publication]',
    host: '[Hébergeur : nom, adresse, pays]',
  },
  // TODO porteur : réseaux sociaux (laisser vide pour masquer).
  socials: {
    facebook: '',
    instagram: '',
    tiktok: '',
  },

  /** URL de l'API d'inscription (ex. https://api.bonilivraison.com/api/inscription). Vide = bascule WhatsApp seule. */
  formEndpoint: (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined) ?? '',
  /** Version du texte de consentement, envoyée avec chaque inscription. */
  consentVersion: '2026-11-09-v1',
};

export const isPlaceholder = (value: string) => value.startsWith('[') || value.includes('000000000') || value.endsWith('.example');

export const whatsappLink = (text: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

/** Préfixe un chemin interne avec la base du site (ex. « /boni » sur GitHub Pages). */
export const url = (chemin: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${chemin}`;
