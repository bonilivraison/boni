/** Limiteur en mémoire (fenêtre glissante) : suffisant pour une seule instance. */
export function creerLimiteur(max: number, fenetreMs: number) {
  const hits = new Map<string, number[]>();
  return (cle: string, maintenant = Date.now()): boolean => {
    const recents = (hits.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
    if (recents.length >= max) {
      hits.set(cle, recents);
      return false;
    }
    recents.push(maintenant);
    hits.set(cle, recents);
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (!v.some((t) => maintenant - t < fenetreMs)) hits.delete(k);
    }
    return true;
  };
}
