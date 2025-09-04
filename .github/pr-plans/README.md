# React Router 7.8.x Migration - PR Plans

This directory contains the detailed execution plans for breaking down PR #3127 (945 files, 96K additions) into 9 manageable PRs.

## 📋 Strategy Document
- **[PRS_STRATEGY.md](./PRS_STRATEGY.md)** - Master strategy document outlining the entire migration approach

## 📁 Individual PR Plans

### Critical Path (Must be done in order)
1. **[PR0_PLAN.md](./PR0_PLAN.md)** - Version Pinning Across Monorepo ⚡ **MUST BE FIRST**
2. **[PR1_PLAN.md](./PR1_PLAN.md)** - Remix-Oxygen Package Updates
3. **[PR2_PLAN.md](./PR2_PLAN.md)** - Hydrogen-React Package Updates
4. **[PR3_PLAN.md](./PR3_PLAN.md)** - Core Hydrogen Package Infrastructure
5. **[PR4_PLAN.md](./PR4_PLAN.md)** - CLI Core Updates (Minimal)
6. **[PR5_PLAN.md](./PR5_PLAN.md)** - Skeleton Template Migration

### Additional PRs (Can be done after PR 5)
7. **[PR6_PLAN.md](./PR6_PLAN.md)** - Mini-Oxygen & Create-Hydrogen Updates
8. **[PR7_PLAN.md](./PR7_PLAN.md)** - CLI Advanced Features
9. **[PR8_PLAN.md](./PR8_PLAN.md)** - All Examples Conversion (~785 files)
10. **[PR9_PLAN.md](./PR9_PLAN.md)** - Recipe Updates

## 🚀 How to Use These Plans

### For Each PR:
1. Open the corresponding PR*_PLAN.md file
2. Follow the phases in order
3. Check off tasks in the Success Criteria Checklist
4. Use the PR Description Template when creating the GitHub PR
5. Refer to the Troubleshooting Guide if you encounter issues

### Quick Start Commands

```bash
# Start PR 0 (Version Pinning)
git checkout main
git pull origin main
git checkout -b feat/pin-react-router-7.8.2

# Cherry-pick the version pinning commit
git cherry-pick 411bb36

# Follow PR0_PLAN.md for detailed steps...
```

## 📊 PR Dependency Graph

```
PR0 (Version Pinning)
├── PR1 (Remix-Oxygen)
├── PR2 (Hydrogen-React)
└── PR3 (Hydrogen Core)
    └── PR4 (CLI Minimal)
        └── PR5 (Skeleton)
            ├── PR6 (Mini-Oxygen)
            ├── PR7 (CLI Advanced)
            ├── PR8 (Examples)
            └── PR9 (Recipes)
```

## ⚠️ Important Notes

1. **PR 0 MUST be merged first** - It establishes version consistency
2. **PR 1-3 can be worked on in parallel** after PR 0
3. **PR 5 (Skeleton) requires PR 0-4** to be merged
4. **PR 7-9 are lower priority** and can be done after core migration
5. **PR 8 is massive** (~785 files) - allocate extra time

## 🔧 Key Commits to Cherry-Pick

| PR | Commits | Description |
|----|---------|-------------|
| PR0 | `411bb36` | Pin React Router versions |
| PR2 | `636bc80`, `df09825` | GraphQL enum fixes, TS 5.9 fixes |
| PR3 | `22e4ca3`, `7ae1060`, `ee23476`, `269853d`, `16f51f4`, `3b9207c` | Core infrastructure |
| PR4 | `543e93a` | Version consistency checks |
| PR7 | `3beb46e`, `a600b04`, `97493ed` | Monorepo detection, auto-linking, diff removal |
| PR8 | `e2b78b1` | Examples conversion |

## 📝 Tracking Progress

Create a tracking issue using this template:

```markdown
## React Router 7.8.x Migration Progress

- [ ] PR 0: Version Pinning
- [ ] PR 1: Remix-Oxygen
- [ ] PR 2: Hydrogen-React
- [ ] PR 3: Hydrogen Core
- [ ] PR 4: CLI Minimal
- [ ] PR 5: Skeleton Template
- [ ] PR 6: Mini-Oxygen
- [ ] PR 7: CLI Advanced
- [ ] PR 8: Examples
- [ ] PR 9: Recipes

### Current Status: Working on PR [X]
```

## 💡 Tips

- Each plan has detailed WHAT/WHY/STEPS for every task
- Use the batch scripts provided in plans for testing
- Document any deviations from the plan
- If a PR becomes too large, consider splitting it
- Keep commits organized by feature/package

## 🔗 Related

- Original PR: #3127
- Branch: `hydrogen-react-router-7.8.x`
- Target: `main`