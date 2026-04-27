import { Module } from "../entities/Module";

export interface ModuleRepository {
  findById(id: string): Promise<Module | null>;
  findAll(): Promise<Module[]>;
  findByDomain(domain: string): Promise<Module[]>;
  save(module: Module): Promise<void>;
}
