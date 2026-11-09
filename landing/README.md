# BoniLivraison — landing page de pré-lancement

Site Astro en TypeScript, 100 % statique, publié sur GitHub Pages. Les inscriptions sont envoyées à l'API du dossier [`../api`](../api), dont l'URL est donnée par `PUBLIC_FORM_ENDPOINT`. Si cette variable est vide, elles passent par WhatsApp.

## Commandes
- `npm install` : installer les dépendances.
- `npm run dev` : lancer le développement sur http://localhost:4321.
- `npm run check` : vérifier les types TypeScript et Astro.
- `npm run build` : générer le site dans `dist/`. Sur Pages, `SITE_URL` et `BASE_PATH=/boni` sont fournis par le workflow.
- `node scripts/og.mjs` : régénérer l'image de partage et l'icône.

## Avant la mise en ligne publique
1. Compléter `src/config/site.ts` : WhatsApp, e-mail, structure juridique.
2. Faire valider `/mentions-legales` et `/confidentialite` par un conseil guinéen, puis compléter les `[…]`.
3. Relire les textes au regard de la liste « à ne pas promettre » du rapport de cadrage (document interne).

## Structure
- `src/components/` : une section de la page par fichier.
- `src/config/site.ts` : informations du porteur, et fonction `url()` qui préfixe les liens avec la base du site.
- `src/styles/tokens.css` : couleurs et typographies de la marque.
- `src/pages/marque.astro` : charte visuelle à partager.
