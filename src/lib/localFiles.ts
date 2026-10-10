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
export async function pickLocalDirectory(options?: {
  /** Identifiant de dossier mémorisé par le navigateur (rouvre au même endroit). */
  id?: string;
  /** "readwrite" permet aussi la suppression de fichiers ensuite. */
  mode?: "read" | "readwrite";
}): Promise<{ handle: any; entries: LocalFileEntry[] } | null> {
  const picker = (window as any).showDirectoryPicker;
  if (typeof picker !== "function") {
    throw new Error("showDirectoryPicker non supporté");
  }

  let root: DirHandle;
  try {
    root = await picker.call(window, { mode: options?.mode ?? "readwrite", id: options?.id });
  } catch (err: any) {
    if (err?.name === "AbortError") return null; // utilisateur a annulé
    throw err;
  }

  return { handle: root, entries: await entriesFromDirHandle(root) };
}

/** Parcourt récursivement un dossier déjà autorisé et retourne la liste des fichiers. */
export async function entriesFromDirHandle(root: any): Promise<LocalFileEntry[]> {
  const entries: LocalFileEntry[] = [];
  const walk = async (dir: DirHandle, prefix: string) => {
    for await (const child of dir.values()) {
      if (child.kind === "directory") {
        // Les brutes rejetées sont déplacées là : on ne les réindexe jamais.
        if (child.name.toLowerCase() === "_rejetées") continue;
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
 * Le nom du dossier racine est retiré pour obtenir les mêmes chemins relatifs
 * que la File System Access API (sinon l'index se croirait entièrement neuf).
 */
export function entriesFromInputFileList(files: FileList): LocalFileEntry[] {
  const entries: LocalFileEntry[] = [];
  let root = "";
  for (let i = 0; i < files.length; i++) {
    const rel = (files[i] as any).webkitRelativePath as string | undefined;
    if (rel && rel.includes("/")) {
      root = rel.split("/")[0] + "/";
      break;
    }
  }
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let rel = ((f as any).webkitRelativePath as string) || f.name;
    if (root && rel.startsWith(root)) rel = rel.slice(root.length);
    entries.push({ name: f.name, relativePath: rel });
  }
  return entries;
}

