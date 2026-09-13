// Mémorisation de l'accès au dossier local d'un projet (File System Access API).
// Les "handles" de dossier sont sérialisables dans IndexedDB : on peut donc
// retrouver l'accès après un rechargement de page, avec l'accord de l'utilisateur.
// Aucun contenu de fichier n'est lu tant que l'utilisateur ne clique pas sur un nom.

const DB_NAME = "photonlog-dirs";
const STORE = "handles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function saveProjectDirHandle(projectId: string, handle: any): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(handle, projectId) as IDBRequest<any>);
  } catch {
    /* accès mémorisé indisponible : non bloquant */
  }
}

export async function getProjectDirHandle(projectId: string): Promise<any | null> {
  try {
    const handle = await tx<any>("readonly", (s) => s.get(projectId));
    return handle || null;
  } catch {
    return null;
  }
}

export async function forgetProjectDirHandle(projectId: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(projectId) as unknown as IDBRequest<any>);
  } catch {
    /* ignore */
  }
}

/**
 * Vérifie (et redemande si besoin) l'autorisation de lecture sur le dossier.
 * `request: false` ne déclenche aucune fenêtre : utile pour savoir si l'accès est prêt.
 */
export async function ensureReadPermission(handle: any, request = true): Promise<boolean> {
  if (!handle?.queryPermission) return false;
  const opts = { mode: "read" as const };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if (!request) return false;
  return (await handle.requestPermission(opts)) === "granted";
}

/**
 * Vérifie (et redemande si besoin) l'autorisation d'écriture sur le dossier,
 * nécessaire pour supprimer un fichier du disque.
 */
export async function ensureWritePermission(handle: any, request = true): Promise<boolean> {
  if (!handle?.queryPermission) return false;
  const opts = { mode: "readwrite" as const };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if (!request) return false;
  return (await handle.requestPermission(opts)) === "granted";
}

/** Supprime définitivement un fichier du dossier mémorisé (pas de corbeille). */
export async function deleteFileFromHandle(handle: any, relativePath: string): Promise<boolean> {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  const tryRemove = async (segments: string[]) => {
    let dir = handle;
    for (const seg of segments.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(seg);
    }
    await dir.removeEntry(segments[segments.length - 1]);
    return true;
  };
  try {
    return await tryRemove(parts);
  } catch {
    if (parts.length > 1 && parts[0] === handle.name) {
      try {
        return await tryRemove(parts.slice(1));
      } catch {
        return false;
      }
    }
    return false;
  }
}

/** Retrouve un fichier dans le dossier mémorisé à partir de son chemin relatif. */
export async function getFileFromHandle(handle: any, relativePath: string): Promise<File | null> {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  // Le chemin relatif du fallback <input webkitdirectory> inclut le nom du dossier racine.
  const tryWalk = async (segments: string[]) => {
    let dir = handle;
    for (const seg of segments.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(seg);
    }
    const fileHandle = await dir.getFileHandle(segments[segments.length - 1]);
    return (await fileHandle.getFile()) as File;
  };
  try {
    return await tryWalk(parts);
  } catch {
    if (parts.length > 1 && parts[0] === handle.name) {
      try {
        return await tryWalk(parts.slice(1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Ouvre le fichier local dans un nouvel onglet (images) ou le télécharge
 * (formats que le navigateur ne sait pas afficher, ex. FITS).
 */
export async function openLocalFile(file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  const viewable = /^(image\/|text\/)/.test(file.type || "");
  if (viewable) {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Identifiant du sélecteur de dossier : caractères alphanumériques
 * uniquement et 32 caractères maximum (contrainte Chrome).
 */
export function pickerId(projectId: string): string {
  return `pl${projectId.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 32);
}

/**
 * Demande à l'utilisateur de désigner le dossier du projet et mémorise le handle.
 * Par défaut en accès lecture simple : il ne s'agit pas d'une importation, on
 * ne fait que retenir l'emplacement du dossier. Passer mode: "readwrite"
 * uniquement si la suppression de fichiers doit être possible ensuite.
 * Lève une erreur si l'API n'est pas disponible (navigateur non compatible ou
 * page affichée dans un cadre intégré).
 */
export async function requestProjectDirHandle(
  projectId: string,
  options?: { mode?: "read" | "readwrite" }
): Promise<any> {
  const picker = (window as any).showDirectoryPicker;
  if (typeof picker !== "function") {
    const e: any = new Error("unsupported");
    e.name = "NotSupportedError";
    throw e;
  }
  const handle = await picker.call(window, { mode: options?.mode ?? "read", id: pickerId(projectId) });
  await saveProjectDirHandle(projectId, handle);
  return handle;
}
