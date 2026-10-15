import { createClient } from '@supabase/supabase-js';

// Dernières vidéos de la chaîne YouTube de LOOHOO, pour la cloche de notifications.
// Aucune clé d'API : on lit le flux public de la chaîne (https://www.youtube.com/feeds/videos.xml?channel_id=…).
// L'adresse de la chaîne est celle réglée dans « Rejoignez la communauté » (liens_communaute, clé « youtube »).
// La réponse est gardée une heure par Vercel : YouTube n'est interrogé qu'une fois par heure, quel que soit le trafic.
// En cas de problème (pas de chaîne réglée, YouTube indisponible), on renvoie une liste vide : la cloche fonctionne sans.

const nettoyer = (t) => String(t || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .trim();

async function identifiantChaine(lien) {
  const direct = lien.match(/\/channel\/(UC[\w-]{22})/);
  if (direct) return direct[1];
  // Adresse en @nom : l'identifiant de la chaîne figure dans la page
  const r = await fetch(lien, { headers: { 'accept-language': 'fr' } });
  if (!r.ok) return null;
  const html = await r.text();
  const trouve = html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/) || html.match(/itemprop="identifier" content="(UC[\w-]{22})"/);
  return trouve ? trouve[1] : null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  let videos = [];
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && cle) {
      const supabase = createClient(url, cle);
      const { data: liens } = await supabase.rpc('liens_communaute');
      const lien = liens?.youtube;
      if (lien && /^https:\/\/(www\.)?youtube\.com\//.test(lien)) {
        const chaine = await identifiantChaine(lien);
        if (chaine) {
          const flux = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${chaine}`);
          if (flux.ok) {
            const xml = await flux.text();
            videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 5).map(([, e]) => {
              const id = (e.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/) || [])[1];
              return {
                id,
                titre: nettoyer((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
                date: (e.match(/<published>([^<]+)<\/published>/) || [])[1],
                lien: id ? `https://www.youtube.com/watch?v=${id}` : null,
              };
            }).filter((v) => v.id && v.titre && v.date);
          }
        }
      }
    }
  } catch {
    videos = [];
  }
  res.statusCode = 200;
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.end(JSON.stringify(videos));
}
