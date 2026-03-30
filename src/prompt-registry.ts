import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export interface PromptTemplate {
  id: string;
  version: string;
  systemPrompt: string;
  userTemplate: string;
  fewShotExamples?: FewShotExample[];
}

export interface FewShotExample {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  explanation: string;
}

export interface PromptVersion {
  version: string;
  status: "active" | "archived";
}

/**
 * PromptRegistry loads and manages versioned prompts from docs/prompts/.
 *
 * Storage layout:
 *   docs/prompts/{PROMPT_ID}/v{VERSION}/system-prompt.md
 *   docs/prompts/{PROMPT_ID}/v{VERSION}/user-template.md
 *   docs/prompts/{PROMPT_ID}/v{VERSION}/few-shot-examples.json  (optional)
 *
 * @see SPEC-001 Section 2.7
 */
export class PromptRegistry {
  private readonly promptsDir: string;
  private readonly cache = new Map<string, PromptTemplate>();

  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir ?? resolve(__dirname, "..", "docs", "prompts");
  }

  /**
   * Load a prompt by ID and optional version.
   * If version is omitted, the active version is used.
   */
  getPrompt(id: string, version?: string): PromptTemplate {
    const resolvedVersion = version ?? this.getActiveVersion(id);
    const cacheKey = `${id}:${resolvedVersion}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const promptDir = join(this.promptsDir, id, resolvedVersion);

    if (!existsSync(promptDir)) {
      if (!existsSync(join(this.promptsDir, id))) {
        throw new Error(
          `Prompt ID "${id}" not found. Available prompt IDs: ${this.listPromptIds().join(", ") || "none"}`
        );
      }
      throw new Error(
        `Version "${resolvedVersion}" not found for prompt "${id}". Available versions: ${this.listVersions(id).map((v) => v.version).join(", ") || "none"}`
      );
    }

    const systemPromptPath = join(promptDir, "system-prompt.md");
    const userTemplatePath = join(promptDir, "user-template.md");

    if (!existsSync(systemPromptPath)) {
      throw new Error(
        `System prompt file not found at ${systemPromptPath}`
      );
    }
    if (!existsSync(userTemplatePath)) {
      throw new Error(
        `User template file not found at ${userTemplatePath}`
      );
    }

    const systemPrompt = readFileSync(systemPromptPath, "utf-8").trim();
    const userTemplate = readFileSync(userTemplatePath, "utf-8").trim();

    const template: PromptTemplate = {
      id,
      version: resolvedVersion,
      systemPrompt,
      userTemplate,
    };

    // Load few-shot examples if present
    const fewShotPath = join(promptDir, "few-shot-examples.json");
    if (existsSync(fewShotPath)) {
      const raw = readFileSync(fewShotPath, "utf-8");
      template.fewShotExamples = JSON.parse(raw) as FewShotExample[];
    }

    this.cache.set(cacheKey, template);
    return template;
  }

  /**
   * List all available versions for a prompt ID.
   */
  listVersions(id: string): PromptVersion[] {
    const idDir = join(this.promptsDir, id);

    if (!existsSync(idDir)) {
      throw new Error(
        `Prompt ID "${id}" not found. Available prompt IDs: ${this.listPromptIds().join(", ") || "none"}`
      );
    }

    const entries = readdirSync(idDir, { withFileTypes: true });
    const versions: PromptVersion[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("v")) {
        versions.push({
          version: entry.name,
          status: "active", // For now, all existing versions are active
        });
      }
    }

    return versions.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Get the active (latest) version for a prompt ID.
   * Currently returns the highest version found on disk.
   */
  getActiveVersion(id: string): string {
    const versions = this.listVersions(id);
    if (versions.length === 0) {
      throw new Error(
        `No versions found for prompt "${id}".`
      );
    }
    // Return the latest version (last after sort)
    return versions[versions.length - 1].version;
  }

  /**
   * List all prompt IDs available in the prompts directory.
   */
  private listPromptIds(): string[] {
    if (!existsSync(this.promptsDir)) {
      return [];
    }

    const entries = readdirSync(this.promptsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => name === name.toUpperCase()); // Prompt IDs are uppercase
  }
}
