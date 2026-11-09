# BoniLivraison

Livraison à la demande à Conakry : colis, documents, repas et achats, à moto ou en voiture.
Ce dépôt contient la **landing page de pré-lancement** et son **API d'inscription**.

| Dossier | Rôle | Hébergement |
|---|---|---|
| [`landing/`](landing) | Site vitrine statique (Astro) | GitHub Pages : https://bonilivraison.github.io/boni/ |
| [`api/`](api) | API d'inscription en TypeScript (Node 24) : validation, export CSV, e-mail | Clever Cloud (Node.js + FS Bucket), ou Docker + Caddy |
| [`docs/marque/`](docs/marque) | Charte de marque | — |

```
navigateur ──► GitHub Pages (landing statique)
     │
     └─ POST /api/inscription ──► Clever Cloud (HTTPS) ──► api (Node) ──► CSV (FS Bucket) + e-mail Brevo
```

## Déployer le site
Chaque push sur `main` qui modifie `landing/` lance une publication sur GitHub Pages (workflow `pages.yml`).

Pour relier le formulaire à l'API :
1. Ouvrir *Settings → Secrets and variables → Actions → Variables*.
2. Créer la variable `PUBLIC_FORM_ENDPOINT`, par exemple `https://api.example.com/api/inscription`.
3. Relancer le workflow.

Sans cette variable, le formulaire envoie les inscriptions par WhatsApp.

## Déployer l'API sur Clever Cloud
1. Dans la console Clever Cloud :
   - créer une application **Node.js** (taille nano ou XS, **1 seule instance**) liée au dépôt GitHub `bonilivraison/boni`, branche `main` ; chaque push sur `main` la redéploie ;
   - créer un add-on **FS Bucket** et le lier à l'application, puis noter son `BUCKET_HOST` ;
   - chez **Brevo**, vérifier l'expéditeur et générer une clé SMTP.
2. Déclarer les variables d'environnement de l'application :

| Variable | Valeur |
|---|---|
| `APP_FOLDER` | `api` |
| `CC_NODE_VERSION` | `24` |
| `CC_NODE_BUILD_TOOL` | `npm-ci` |
| `NODE_ENV` | `production` |
| `CC_HEALTH_CHECK_PATH` | `/health` |
| `CC_FS_BUCKET` | `/data:<BUCKET_HOST>` |
| `DATA_DIR` | `data` (résolu depuis `APP_HOME`, donc dans le bucket) |
| `ALLOWED_ORIGINS` | `https://bonilivraison.github.io` |
| `TRUST_PROXY` | `true` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp-relay.brevo.com` / `587` |
| `SMTP_USER` / `SMTP_PASS` | identifiant et clé SMTP Brevo |
| `MAIL_FROM` | expéditeur vérifié chez Brevo |
| `MAIL_TO` | destinataires des inscriptions |

3. Vérifier que l'API répond : `curl https://<app>.cleverapps.io/health` doit renvoyer `{"ok":true}`.
4. Brancher le site sur l'API :
   ```bash
   gh variable set PUBLIC_FORM_ENDPOINT -R bonilivraison/boni -b https://<app>.cleverapps.io/api/inscription
   ```
   puis relancer le workflow `pages.yml`.

Les CSV se consultent avec `clever ssh`, dans le dossier `data/`.

## Déployer l'API sur un serveur Docker (alternative)
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
