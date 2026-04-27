import { createModule, publishModule } from "@/domains/course/entities/Module";

describe("Module entity — London School TDD", () => {
  const validProps = {
    id: "01",
    slug: "vpc-deep-dive",
    title: "VPC Deep Dive",
    domain: "design" as const,
    difficulty: "specialty" as const,
    estimatedHours: 6,
    objectives: [
      { id: "o1", description: "Explain VPC CIDR design", bloomsLevel: "understand" as const },
    ],
    prerequisites: [],
    topics: ["CIDR planning", "Subnet design"],
  };

  describe("createModule", () => {
    it("creates a module with isPublished false", () => {
      const m = createModule(validProps);
      expect(m.isPublished).toBe(false);
    });

    it("throws when id is empty", () => {
      expect(() => createModule({ ...validProps, id: "" })).toThrow("Module id is required");
    });

    it("throws when title is empty", () => {
      expect(() => createModule({ ...validProps, title: "" })).toThrow("Module title is required");
    });

    it("throws when estimatedHours is zero", () => {
      expect(() => createModule({ ...validProps, estimatedHours: 0 })).toThrow("estimatedHours must be positive");
    });
  });

  describe("publishModule", () => {
    it("publishes a module with objectives", () => {
      const m = createModule(validProps);
      const published = publishModule(m);
      expect(published.isPublished).toBe(true);
    });

    it("throws when module has no objectives", () => {
      const m = createModule({ ...validProps, objectives: [] });
      expect(() => publishModule(m)).toThrow("Cannot publish module with no learning objectives");
    });
  });
});
