import { Module, createModule, publishModule } from "../entities/Module";
import { ModuleRepository } from "../repositories/ModuleRepository";
import { Outcome, ok, fail } from "@/types";

export class ModuleService {
  constructor(private readonly moduleRepo: ModuleRepository) {}

  async getAllModules(): Promise<Module[]> {
    return this.moduleRepo.findAll();
  }

  async publishModule(id: string): Promise<Outcome<Module>> {
    const module = await this.moduleRepo.findById(id);
    if (!module) return fail(`Module ${id} not found`);
    try {
      const published = publishModule(module);
      await this.moduleRepo.save(published);
      return ok(published);
    } catch (e: unknown) {
      return fail(e instanceof Error ? e.message : "Unknown error");
    }
  }
}
