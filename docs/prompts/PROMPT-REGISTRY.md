# Prompt Registry

All prompts are version-controlled per BHIL conventions. Versioning follows semantic versioning:
- **Major**: Format or structural change (new fields, changed JSON schema)
- **Minor**: New examples or additional guidance added
- **Patch**: Wording refinements, typo fixes

## Registry

| Prompt ID | Version | Modality | Type | Path |
|-----------|---------|----------|------|------|
| radiology-system | v1.0 | Radiology | System | `radiology-system/v1.0/system-prompt.md` |
| radiology-user | v1.0 | Radiology | User template | `radiology-user/v1.0/user-template.md` |
| dermatology-system | v1.0 | Dermatology | System | `dermatology-system/v1.0/system-prompt.md` |
| dermatology-user | v1.0 | Dermatology | User template | `dermatology-user/v1.0/user-template.md` |
| pathology-system | v1.0 | Pathology | System | `pathology-system/v1.0/system-prompt.md` |
| pathology-user | v1.0 | Pathology | User template | `pathology-user/v1.0/user-template.md` |
| ophthalmology-system | v1.0 | Ophthalmology | System | `ophthalmology-system/v1.0/system-prompt.md` |
| ophthalmology-user | v1.0 | Ophthalmology | User template | `ophthalmology-user/v1.0/user-template.md` |
| structured-output | v1.0 | All | Instruction | `structured-output/v1.0/instruction.md` |

## Usage

The inference engine loads prompts by ID and resolves the latest version. Prompts are cached in memory at startup.

Message construction per SPEC-001 §2:
```
system: {modality}-system prompt
user:   {modality}-user template (with {{user_query}} substituted) + structured-output instruction
```

*"Specifications are the source of truth, not code." — BHIL*
