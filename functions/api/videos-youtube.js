import { appeler } from '../../cloudflare/outils.js';

// Dernières vidéos de la chaîne YouTube de LOOHOO pour la cloche (version Cloudflare Pages de api/videos-youtube.js).
// Flux public de la chaîne, sans clé d'API. Gardé une heure dans le cache de Cloudflare : YouTube n'est pas interrogé à chaque visite.
const nettoyer = (t) => String(t || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .trim();

async function identifiantChaine(lien) {
  const direct = lien.match(/\/channel\/(UC[\w-]{22})/);
  if (direct) return direct[1];
  const r = await fetch(lien, { headers: { 'accept-language': 'fr' } });
  if (!r.ok) return null;
  const html = await r.text();
  const trouve = html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/) || html.match(/itemprop="identifier" content="(UC[\w-]{22})"/);
  return trouve ? trouve[1] : null;
}

async function videos(env) {
  const liens = await appeler(env, 'liens_communaute');
  const lien = liens?.youtube;
  if (!lien || !/^https:\/\/(www\.)?youtube\.com\//.test(lien)) return [];
  const chaine = await identifiantChaine(lien);
  if (!chaine) return [];
  const flux = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${chaine}`);
  if (!flux.ok) return [];
  const xml = await flux.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 5).map(([, e]) => {
    const id = (e.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/) || [])[1];
    return {
      id,
      titre: nettoyer((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
      date: (e.match(/<published>([^<]+)<\/published>/) || [])[1],
      lien: id ? `https://www.youtube.com/watch?v=${id}` : null,
    };
  }).filter((v) => v.id && v.titre && v.date);
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cle = new Request(new URL('/api/videos-youtube', context.request.url).toString());
  const enCache = await cache.match(cle);
  if (enCache) return enCache;
  let liste = [];
  try { liste = await videos(context.env); } catch { liste = []; }
  const reponse = new Response(JSON.stringify(liste), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
  context.waitUntil(cache.put(cle, reponse.clone()));
  return reponse;
}
