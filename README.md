# BoniLivraison

Livraison à la demande à Conakry : colis, documents, repas et achats, à moto ou en voiture.
Ce dépôt contient la **landing page de pré-lancement** et son **API d'inscription**.

| Dossier | Rôle | Hébergement |
|---|---|---|
| [`landing/`](landing) | Site vitrine statique (Astro) | GitHub Pages : https://bonilivraison.github.io/boni/ |
| [`api/`](api) | API d'inscription en TypeScript (Node 24) : validation, export CSV, e-mail | Serveur Docker, derrière Caddy (HTTPS) |
| [`docs/marque/`](docs/marque) | Charte de marque | — |

```
navigateur ──► GitHub Pages (landing statique)
     │
     └─ POST /api/inscription ──► Caddy (HTTPS) ──► api (Node) ──► CSV + e-mail SMTP
```

## Déployer le site
Chaque push sur `main` qui modifie `landing/` lance une publication sur GitHub Pages (workflow `pages.yml`).

Pour relier le formulaire à l'API :
1. Ouvrir *Settings → Secrets and variables → Actions → Variables*.
2. Créer la variable `PUBLIC_FORM_ENDPOINT`, par exemple `https://api.example.com/api/inscription`.
3. Relancer le workflow.

Sans cette variable, le formulaire envoie les inscriptions par WhatsApp.

## Déployer l'API sur un serveur
Prérequis : un serveur avec Docker, les ports 80 et 443 ouverts, et un sous-domaine qui pointe dessus.

```bash
git clone git@github.com:bonilivraison/boni.git && cd boni/api
cp .env.example .env   # renseigner API_DOMAIN, SMTP_*, MAIL_TO
mkdir -p data && sudo chown 1000 data
docker compose --profile prod up -d --build
curl https://$API_DOMAIN/health
```

Pour mettre à jour : `git pull && docker compose --profile prod up -d --build`.

## Développer en local
```bash
cd api && cp .env.example .env    # SMTP_HOST=mailpit, SMTP_PORT=1025, ALLOWED_ORIGINS=http://localhost:4321
docker compose --profile dev up -d --build   # API :8787, e-mails captés sur http://localhost:8025
cd ../landing && echo "PUBLIC_FORM_ENDPOINT=http://localhost:8787/api/inscription" > .env && npm i && npm run dev
```
