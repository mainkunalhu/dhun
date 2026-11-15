import { randomUUID } from 'node:crypto';
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { Project, ProjectSummary } from '../../shared/project';

const PROJECT_FILE = 'project.json';
const ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME = 80;
const MAX_SLUG = 48;

/**
 * Projects live as plain folders on disk:
 *
 *   <root>/week-32-reel/project.json
 *
 * The folder is named after the project, so renaming a project renames its
 * folder. The stable id lives inside project.json, so a folder rename never
 * breaks a reference. No database, no index to rebuild.
 */
export function createProjectStore(root: string) {
  const folderPath = (folder: string) => path.join(root, folder);
  const filePath = (folder: string) => path.join(root, folder, PROJECT_FILE);

  async function readFolder(folder: string): Promise<Project> {
    const raw = await readFile(filePath(folder), 'utf8');
    const data = JSON.parse(raw) as Partial<Project>;

    if (
      !data ||
      typeof data.id !== 'string' ||
      !ID_PATTERN.test(data.id) ||
      typeof data.name !== 'string'
    ) {
      throw new Error(`Invalid project file in ${folder}`);
    }

    return {
      id: data.id,
      name: data.name,
      favorite: data.favorite === true,
      createdAt:
        typeof data.createdAt === 'string'
          ? data.createdAt
          : new Date(0).toISOString(),
      updatedAt:
        typeof data.updatedAt === 'string'
          ? data.updatedAt
          : new Date(0).toISOString(),
    };
  }

  async function writeFolder(folder: string, project: Project): Promise<void> {
    await mkdir(folderPath(folder), { recursive: true });
    const file = filePath(folder);
    const temp = `${file}.tmp`;
    await writeFile(temp, `${JSON.stringify(project, null, 2)}\n`, 'utf8');
    await rename(temp, file);
  }

  async function list(): Promise<ProjectSummary[]> {
    await mkdir(root, { recursive: true });
    const entries = await readdir(root, { withFileTypes: true });
    const projects: ProjectSummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const project = await readFolder(entry.name);
        projects.push({ ...project, voices: 0, takes: 0 });
      } catch {
        // A folder without a readable project.json is not a project; skip it.
      }
    }

    return projects.sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async function locate(
    id: string,
  ): Promise<{ folder: string; project: Project }> {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new Error('Invalid project id.');
    }

    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const project = await readFolder(entry.name);
        if (project.id === id) return { folder: entry.name, project };
      } catch {
        // Skip unreadable folders.
      }
    }

    throw new Error('Project not found.');
  }

  async function folderExists(folder: string): Promise<boolean> {
    try {
      await access(folderPath(folder));
      return true;
    } catch {
      return false;
    }
  }

  async function uniqueFolder(base: string, ignore?: string): Promise<string> {
    let candidate = base;
    let suffix = 2;

    while (candidate !== ignore && (await folderExists(candidate))) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  function slugify(name: string, id: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_SLUG)
      .replace(/-+$/g, '');

    return slug || `project-${id.slice(0, 8)}`;
  }

  function cleanName(name: string): string {
    if (typeof name !== 'string') throw new Error('Project name is required.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Project name is required.');
    if (trimmed.length > MAX_NAME) {
      throw new Error(`Project names can be at most ${MAX_NAME} characters.`);
    }
    return trimmed;
  }

  async function get(id: string): Promise<ProjectSummary> {
    const { project } = await locate(id);
    return { ...project, voices: 0, takes: 0 };
  }

  async function create(name: string): Promise<Project> {
    const clean = cleanName(name);
    const id = randomUUID();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: clean,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };

    const folder = await uniqueFolder(slugify(clean, id));
    await writeFolder(folder, project);
    return project;
  }

  async function renameProject(id: string, name: string): Promise<Project> {
    const { folder, project } = await locate(id);

    project.name = cleanName(name);
    project.updatedAt = new Date().toISOString();

    // Write first: if the folder rename fails, the data is still correct and
    // the next rename repairs the folder name.
    await writeFolder(folder, project);

    const nextFolder = await uniqueFolder(slugify(project.name, id), folder);
    if (nextFolder !== folder) {
      await rename(folderPath(folder), folderPath(nextFolder));
    }

    return project;
  }

  async function setFavorite(id: string, favorite: boolean): Promise<Project> {
    const { folder, project } = await locate(id);
    project.favorite = favorite === true;
    await writeFolder(folder, project);
    return project;
  }

  async function remove(id: string): Promise<void> {
    const { folder } = await locate(id);
    await rm(folderPath(folder), { recursive: true, force: true });
  }

  return {
    root,
    list,
    get,
    create,
    rename: renameProject,
    setFavorite,
    remove,
  };
}
