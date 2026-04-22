# Tutorial System Setup — Phase 0 Complete ✅

**Date**: 2026-04-22  
**Status**: Architecture and scaffolding ready for Phase 1 content creation  
**Next**: Begin writing Module 1 (Tokens & Tokenization)

---

## What Was Created (Phase 0)

### Architecture Decisions (ADRs)
- ✅ **ADR-001**: MDX as source format for all content
- ✅ **ADR-002**: Netlify + GitHub for hosting and deployment
- ✅ **ADR-003**: Modular lessons (10-20 min, 1-2 concepts each)
- ✅ **ADR-004**: TDD for assessments (write tests before content)

**Location**: `ADR/` folder  
**Purpose**: Reference these when making decisions about content structure

### Domain-Driven Design (DDD)
- ✅ **Domain Model**: Entities (Module, Lesson, Assessment) and aggregates
- ✅ **Ubiquitous Language**: Shared vocabulary (Module, Concept, Learning Outcome, etc.)
- ✅ **Bounded Contexts**: Three subsystems (Content Creation, Course Management, Publishing)

**Location**: `DDD/` folder  
**Purpose**: Align team on terminology and architecture

### Development Workflow
- ✅ **DEVELOPMENT.md**: Step-by-step TDD guide for writing modules
  - RED: Write assessment (30-60 min)
  - GREEN: Write content (2-3 hours)
  - REFACTOR: Polish (1-2 hours)
  - PUBLISH: Deploy (1 hour)

**Total time per module**: 5-7 hours

### Configuration & Tooling
- ✅ **package.json**: Node dependencies (Astro, React, Tailwind)
- ✅ **netlify.toml**: Deployment configuration
- ✅ **.gitignore-tutorial**: What to exclude from git

### Testing & Validation
- ✅ **tests/content-validation.spec.json**: 10 automated checks per module
  - Coverage (learning outcomes ↔ assessment)
  - Quality (word count, link checking, asset validation)
  - Answerability (external reviewer test)

### Documentation
- ✅ **docs/index.mdx**: Course homepage (learning paths, module map)
- ✅ **TUTORIAL-SETUP.md**: This file (what was created)

---

## Project Structure

```
vibe-cast/
├── ADR/                                   ← Architecture decisions
│   ├── ADR-001-mdx-format.md
│   ├── ADR-002-netlify-hosting.md
│   ├── ADR-003-modular-lessons.md
│   └── ADR-004-tdd-assessments.md
│
├── DDD/                                   ← Domain design
│   ├── domain-model.md
│   └── ubiquitous-language.md
│
├── docs/                                  ← Tutorial content
│   ├── index.mdx                         ← Course homepage
│   └── modules/                          ← (will contain module-01/, module-02/, etc.)
│       ├── module-01-tokens/
│       │   ├── index.mdx                 ← Main lesson (to be written)
│       │   ├── objectives.json           ← Learning outcomes (to be written)
│       │   ├── assessment.json           ← Quiz (to be written)
│       │   ├── exercises.json            ← Practice problems (to be written)
│       │   └── assets/
│       │       ├── diagrams/
│       │       ├── code/
│       │       └── images/
│       └── module-02-transformers/
│           └── (same structure as module-01)
│
├── tests/                                 ← Validation specs
│   └── content-validation.spec.json
│
├── DEVELOPMENT.md                        ← TDD workflow guide
├── TUTORIAL-SETUP.md                     ← This file
├── package.json                          ← Dependencies
├── netlify.toml                          ← Deployment config
├── .gitignore-tutorial                   ← Git ignore rules
│
└── (other files from vibe-cast project)
```

---

## Next Steps: Phase 1 Content Creation

### Before Starting Module 1:

1. **Rename .gitignore**
   ```bash
   cd vibe-cast
   mv .gitignore-tutorial .gitignore
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Test build**
   ```bash
   npm run build
   # Should complete without errors
   ```

### To Create Module 1 (Tokens & Tokenization):

Follow the TDD workflow in `DEVELOPMENT.md`:

#### Red Phase (30-60 min)
```bash
# 1. Create module folder
mkdir -p docs/modules/module-01-tokens/assets/{diagrams,code,images}

# 2. Write objectives.json (3-5 learning outcomes)
# See example in DEVELOPMENT.md

# 3. Write assessment.json (5-7 assessment questions)
# See example in DEVELOPMENT.md
```

#### Green Phase (2-3 hours)
```bash
# 4. Write index.mdx (content outline → first draft)
# See template in DEVELOPMENT.md
```

#### Refactor Phase (1-2 hours)
```bash
# 5. Add examples, diagrams, code
# 6. Polish and clarify
```

#### Publish Phase (1 hour)
```bash
# 7. Validate
npm run validate-assessment
npm run validate-content
npm run check-links

# 8. Commit
git add -A
git commit -m "feat: Add module-01-tokens

- Define 3 learning outcomes
- Create assessment with 7 questions
- Write content (~2000 words)
- Add diagrams and code examples

Co-Authored-By: Claude <noreply@anthropic.com>"

# 9. Deploy (Netlify auto-deploys on push)
git push origin tutorial-system

# 10. Test live
# Visit: https://ai-safety-tutorial.netlify.app
```

---

## Quality Checklist (Per Module)

Before publishing, verify:

- [ ] **Structure**: objectives.json + assessment.json + index.mdx exist
- [ ] **Coverage**: Each learning outcome has ≥1 assessment question
- [ ] **Content**: Covers all outcomes, 1800-2200 words, includes examples
- [ ] **Assets**: ≥1 diagram, ≥1 code example, proper file organization
- [ ] **Validation**: `npm run validate-content` passes
- [ ] **Links**: No broken links (internal or external)
- [ ] **Answerability**: External reviewer can pass assessment
- [ ] **Mobile**: Responsive on phone/tablet/desktop
- [ ] **Accessibility**: Proper headings, alt text on images

---

## Key Files to Remember

### For Writing Content
- **DEVELOPMENT.md** — Your step-by-step guide (bookmark this!)
- **DDD/ubiquitous-language.md** — Terminology guide
- **docs/modules/module-01-tokens/index.mdx** — Template structure

### For Validation
- **tests/content-validation.spec.json** — What "good" looks like
- **DEVELOPMENT.md** → "Quality Checklist" section

### For Deployment
- **netlify.toml** — Already configured ✓
- **package.json** — Dependencies ✓
- **.gitignore** — What not to commit ✓

---

## Troubleshooting

### Build fails
```bash
npm run build  # Check for errors
npm install    # Reinstall dependencies
```

### Link checker complains
```bash
npm run check-links  # See which links are broken
```

### Unsure about module structure?
```bash
# Read these in order:
1. ADR-003 (what is a module?)
2. DEVELOPMENT.md (how to write one)
3. DDD/ubiquitous-language.md (terminology)
```

---

## Phase Timeline

```
Phase 0 (Setup) — ✅ COMPLETE
  ├─ ADRs written
  ├─ DDD models created
  ├─ Tooling configured
  └─ DEVELOPMENT.md guides ready

Phase 1 (Content) — NEXT (Days 3-9)
  ├─ Module 1: Tokens [Day 3]
  ├─ Module 2: Transformers [Day 4-5]
  ├─ Module 3: SVD [Day 6-7]
  └─ Module 4: Abliteration [Day 8-9]

Phase 2 (Distribution) — (Days 10-14)
  ├─ LinkedIn Learning export
  ├─ Disco card creation
  └─ Blog post adaptation

Phase 3 (Automation) — (Optional, future)
  ├─ CI/CD validation
  ├─ Auto-format conversion
  └─ Analytics dashboard
```

---

## Success Criteria

### Phase 0 (Now) ✅
- [x] All ADRs written and agreed
- [x] DDD models documented
- [x] Development workflow clear
- [x] Build pipeline configured
- [x] Course homepage template created

### Phase 1 (Next)
- [ ] 4 modules with complete assessments
- [ ] Passing rate ≥70% on external review
- [ ] All content published to Netlify
- [ ] Analytics showing user engagement

### Phase 2 & Beyond
- [ ] Multi-channel publication
- [ ] Automated deployment pipeline
- [ ] Scaled to 10+ modules
- [ ] Community feedback loop

---

## Resources

### Documentation
- [DEVELOPMENT.md](./DEVELOPMENT.md) — How to write a module
- [DDD/ubiquitous-language.md](./DDD/ubiquitous-language.md) — Terminology
- [ADR/](./ADR/) — Architecture decisions

### External Tools
- [Astro Docs](https://docs.astro.build) — Build framework
- [MDX Docs](https://mdxjs.com) — Content format
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Netlify Docs](https://docs.netlify.com) — Deployment

### Original Research
- StrongREJECT Paper: [arXiv 2402.10260](https://arxiv.org/abs/2402.10260)
- GitHub: [dsbowen/strong_reject](https://github.com/dsbowen/strong_reject)

---

## Questions?

Refer to:
1. **DEVELOPMENT.md** for "how to write a module"
2. **DDD/ubiquitous-language.md** for "what do we call this?"
3. **ADR/ADR-00X.md** for "why did we decide this?"

---

**Phase 0 Complete!** 🎉  
**Ready to begin Phase 1 content creation.**

Next action: Create Module 1 (Tokens & Tokenization)  
Estimated time: 5-7 hours
