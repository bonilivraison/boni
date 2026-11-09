import { createServer, type IncomingMessage } from 'node:http';
import { configDepuisEnv, creerApp } from './app.ts';

const config = configDepuisEnv();
const traiter = creerApp(config);
const port = Number(process.env.PORT ?? 8080);
const hote = process.env.HOST ?? '0.0.0.0';
const trustProxy = process.env.TRUST_PROXY === 'true';

/** X-Forwarded-For n'est fiable que derrière notre propre reverse proxy. */
function ipDe(req: IncomingMessage): string {
  const xff = req.headers['x-forwarded-for'];
  const premier = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
  return (trustProxy && premier) || req.socket.remoteAddress || 'inconnue';
}

const serveur = createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    let taille = 0;
    for await (const c of req) {
      taille += (c as Buffer).length;
      if (taille > 16 * 1024) {
        res.writeHead(413).end();
        req.destroy();
        return;
      }
      chunks.push(c as Buffer);
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, {
      method: req.method,
      headers,
      body: hasBody ? Buffer.concat(chunks) : undefined,
    });
    const response = await traiter(request, ipDe(req));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error('[http] erreur', e);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

serveur.listen(port, hote, () => {
  console.info(`API BoniLivraison sur http://${hote}:${port} · origines : ${config.origines.join(', ') || 'toutes'}`);
});

for (const sig of ['SIGTERM', 'SIGINT'] as const) process.on(sig, () => serveur.close(() => process.exit(0)));
