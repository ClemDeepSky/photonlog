// Cache mémoire des fichiers locaux d'un projet (durée de la session/onglet).
// Utile quand l'accès au dossier n'a pas pu être mémorisé (aperçu en iframe,
// navigateur sans File System Access API) : on garde les objets File issus du
// champ <input webkitdirectory> pour pouvoir ouvrir une brute au clic.
// Aucun contenu n'est lu ni envoyé : ce sont de simples références.

const cache = new Map<string, Map<string, File>>();

const normalize = (p: string) => p.replace(/\\/g, "/").replace(/^\/+/, "");

export function cacheProjectFiles(projectId: string, files: File[]): void {
  const map = new Map<string, File>();
  for (const f of files) {
    const rel = normalize((f as any).webkitRelativePath || f.name);
    map.set(rel, f);
    // Clé secondaire sans le dossier racine, comme les chemins enregistrés.
    const parts = rel.split("/");
    if (parts.length > 1) map.set(parts.slice(1).join("/"), f);
    map.set(f.name, f);
  }
  cache.set(projectId, map);
}

export function getCachedProjectFile(projectId: string, relativePath: string, fileName?: string): File | null {
  const map = cache.get(projectId);
  if (!map) return null;
  const rel = normalize(relativePath);
  const parts = rel.split("/");
  return (
    map.get(rel) ||
    (parts.length > 1 ? map.get(parts.slice(1).join("/")) : undefined) ||
    (fileName ? map.get(fileName) : undefined) ||
    map.get(parts[parts.length - 1]) ||
    null
  );
}

export function hasCachedProjectFiles(projectId: string): boolean {
  return (cache.get(projectId)?.size ?? 0) > 0;
}

// Liste des entrées (noms + chemins relatifs) associée au cache de fichiers,
// pour relancer un indexage sans repasser par le sélecteur de dossier.
const entriesCache = new Map<string, { name: string; relativePath: string }[]>();

export function cacheProjectEntries(projectId: string, entries: { name: string; relativePath: string }[]): void {
  entriesCache.set(projectId, entries);
}

export function getCachedProjectEntries(projectId: string): { name: string; relativePath: string }[] | null {
  return entriesCache.get(projectId) ?? null;
}
