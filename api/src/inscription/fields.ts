import type { Inscription } from './schema.ts';

/** Champs lisibles d'une inscription, dans l'ordre d'affichage (e-mail et export). */
export function lisible(i: Inscription): [string, string][] {
  const base: [string, string][] = (() => {
    switch (i.profil) {
      case 'client':
        return [
          ['Prénom', i.prenom],
          ['Services', i.services.join(', ') || '—'],
        ];
      case 'partenaire':
        return [
          ['Établissement', i.etablissement],
          ['Type', i.type],
          ['Contact', i.contact],
          ['Commandes / jour', i.volume || 'Non précisé'],
        ];
      case 'livreur':
        return [
          ['Prénom', i.prenom],
          ['Nom', i.nom],
          ['Véhicule', i.vehicule],
          ['Permis', i.permis],
          ['18 ans ou plus', 'Oui'],
        ];
    }
  })();
  return [
    ...base,
    ['Téléphone', i.telephone],
    ['Quartier', i.quartier],
    ['Accepte d’être recontacté', 'Oui'],
    ['Accepte la promotion', i.consentement_promotion ? 'Oui' : 'Non'],
    ['Version du consentement', i.consentement_version],
    ['Date du consentement', i.consentement_date],
  ];
}
