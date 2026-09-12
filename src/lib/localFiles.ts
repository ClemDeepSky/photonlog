// Lecture de la liste des fichiers d'un dossier local SANS jamais lire
// ni télécharger le contenu des fichiers.
//
// Méthode préférée : File System Access API (showDirectoryPicker).
// On itère uniquement sur les "handles" et leurs noms — aucun objet File
// n'est matérialisé, aucune donnée n'est lue en mémoire.
//
// Fallback : <input webkitdirectory> — le navigateur fournit les noms et
// chemins relatifs (webkitRelativePath) ; on ne lit jamais file.text() etc.

export interface LocalFileEntry {
  /** Nom du fichier (ex: M42_Ha_001.fit) */
  name: string;
  /** Chemin relatif depuis la racine du dossier choisi (ex: Ha/Panneau1/M42_Ha_001.fit) */
  relativePath: string;
}

type DirHandle = {
  values: () => AsyncIterableIterator<any>;
};

/**
 * Ouvre le sélecteur de dossier natif et retourne la liste des fichiers
 * (noms + chemins relatifs) en parcourant récursivement les sous-dossiers.
 * Retourne null si l'utilisateur annule.
 * Lève une erreur si l'API n'est pas supportée par le navigateur.
 */
export async function listLocalFiles(): Promise<LocalFileEntry[] | null> {
  const picked = await pickLocalDirectory();
  if (!picked) return null;
  return picked.entries;
}

/**
 * Comme listLocalFiles, mais retourne aussi le "handle" du dossier choisi afin
 * de pouvoir mémoriser l'accès et rouvrir un fichier plus tard.
 */
export async function pickLocalDirectory(): Promise<{ handle: any; entries: LocalFileEntry[] } | null> {
  const picker = (window as any).showDirectoryPicker;
  if (typeof picker !== "function") {
    throw new Error("showDirectoryPicker non supporté");
  }

  let root: DirHandle;
  try {
    root = await picker.call(window, { mode: "read" });
  } catch (err: any) {
    if (err?.name === "AbortError") return null; // utilisateur a annulé
    throw err;
  }

  const entries: LocalFileEntry[] = [];

  const walk = async (dir: DirHandle, prefix: string) => {
    for await (const child of dir.values()) {
      if (child.kind === "directory") {
        await walk(child as DirHandle, prefix + child.name + "/");
      } else {
        // Jamais de child.getFile() ici : le nom du handle suffit.
        entries.push({ name: child.name, relativePath: prefix + child.name });
      }
    }
  };

  await walk(root, "");
  return entries;
}

/** true si le navigateur supporte la File System Access API (Chrome, Edge…). */
export function supportsDirectoryPicker(): boolean {
  return typeof (window as any).showDirectoryPicker === "function";
}

/**
 * Fallback pour les navigateurs sans File System Access API :
 * convertit la FileList d'un <input webkitdirectory> en simple liste de noms.
 */
export function entriesFromInputFileList(files: FileList): LocalFileEntry[] {
  const entries: LocalFileEntry[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    entries.push({
      name: f.name,
      relativePath: (f as any).webkitRelativePath || f.name,
    });
  }
  return entries;
}
