import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface ModuleMeta {
  id: string;
  slug: string;
  title: string;
  domain: string;
  difficulty: string;
  estimatedHours: number;
  prerequisites: string[];
  topics: string[];
  objectives: { id: string; description: string; bloomsLevel: string }[];
  personas: string[];
}

export interface ModuleData extends ModuleMeta {
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

function slugToDir(slug: string): string {
  const dirs = fs.readdirSync(CONTENT_DIR);
  const match = dirs.find(d => d.toLowerCase().includes(slug.toLowerCase()));
  return match ?? slug;
}

export function getAllModuleSlugs(): string[] {
  return fs.readdirSync(CONTENT_DIR)
    .filter(d => fs.statSync(path.join(CONTENT_DIR, d)).isDirectory())
    .map(d => d.replace(/^M\d+-/, "").toLowerCase());
}

export function getModuleBySlug(slug: string): ModuleData | null {
  try {
    const dir = slugToDir(slug);
    const filePath = path.join(CONTENT_DIR, dir, "index.mdx");
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    return {
      id: data.id ?? "",
      slug,
      title: data.title ?? slug,
      domain: data.domain ?? "design",
      difficulty: data.difficulty ?? "specialty",
      estimatedHours: data.estimatedHours ?? 0,
      prerequisites: data.prerequisites ?? [],
      topics: data.topics ?? [],
      objectives: data.objectives ?? [],
      personas: data.personas ?? ["student", "teacher", "practitioner"],
      content,
    };
  } catch {
    return null;
  }
}

export function getAllModules(): ModuleData[] {
  return getAllModuleSlugs()
    .map(s => getModuleBySlug(s))
    .filter((m): m is ModuleData => m !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}
