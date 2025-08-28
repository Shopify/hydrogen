# Auto-linking Implementation TODO

## Objective
Implement intelligent auto-linking for CLI commands in the Hydrogen monorepo to support all development workflows without manual `shopify plugins link` steps.

## Implementation Phases

### Phase 1: Foundation Setup
- [ ] **1.1** Create `packages/cli/src/lib/plugin-autolinker.ts` with stub functions
  - [ ] Define TypeScript interfaces for options
  - [ ] Create empty exported functions
  - [ ] Add JSDoc comments for each function
- [ ] **CHECKPOINT 1.1**: Review stub implementation and interfaces

- [ ] **1.2** Implement monorepo detection logic
  - [ ] Port `isInsideHydrogenMonorepo()` usage
  - [ ] Add `isExternalProject()` function
  - [ ] Add `isExampleDirectory()` function
  - [ ] Add unit tests for detection functions
- [ ] **CHECKPOINT 1.2**: Validate detection logic with test cases

- [ ] **1.3** Implement plugin status checking
  - [ ] Create `isPluginLinked()` function
  - [ ] Add environment variable checking (`HYDROGEN_CLI_AUTOLINKED`)
  - [ ] Add debug output for status checks
- [ ] **CHECKPOINT 1.3**: Test plugin status detection

### Phase 2: Core Linking Logic
- [ ] **2.1** Implement the linking mechanism
  - [ ] Create `linkPlugin()` function using `execAsync`
  - [ ] Add error handling with silent failures
  - [ ] Add success/failure debug output
- [ ] **CHECKPOINT 2.1**: Test manual linking function

- [ ] **2.2** Implement smart decision logic
  - [ ] Create `shouldAutoLink()` function
  - [ ] Define `SKIP_COMMANDS` array (init, login, logout, etc.)
  - [ ] Implement --path flag detection
  - [ ] Add npm script detection
- [ ] **CHECKPOINT 2.2**: Review decision matrix logic

- [ ] **2.3** Create main orchestrator function
  - [ ] Implement `ensureMonorepoPluginLinked()`
  - [ ] Add caching via environment variable
  - [ ] Add performance timing in debug mode
- [ ] **CHECKPOINT 2.3**: Test orchestrator with mock scenarios

### Phase 3: Hook Integration
- [ ] **3.1** Prepare hooks/init.ts for integration
  - [ ] Import the autolinker module
  - [ ] Identify insertion point (after project validation)
  - [ ] Add feature flag for easy disable (`HYDROGEN_DISABLE_AUTOLINK`)
- [ ] **CHECKPOINT 3.1**: Review hook modification plan

- [ ] **3.2** Integrate auto-linking into init hook
  - [ ] Add the auto-linking call
  - [ ] Ensure it doesn't break on errors
  - [ ] Add debug output for hook execution
- [ ] **CHECKPOINT 3.2**: Test hook integration with simple command

### Phase 4: Testing - Examples Workflow
- [ ] **4.1** Test b2b example
  - [ ] Kill all running dev servers
  - [ ] Run `cd examples/b2b && npm run dev`
  - [ ] Verify auto-linking occurs
  - [ ] Verify dev server starts successfully
- [ ] **CHECKPOINT 4.1**: Confirm b2b example works

- [ ] **4.2** Test other example commands
  - [ ] Test `npm run build` in b2b
  - [ ] Test `npm run preview` in b2b  
  - [ ] Test `npm run codegen` in b2b
- [ ] **CHECKPOINT 4.2**: Confirm all b2b scripts work

### Phase 5: Testing - External Projects
- [ ] **5.1** Create test external project
  - [ ] Run `shopify hydrogen init /tmp/test-hydrogen`
  - [ ] Verify project created successfully
- [ ] **CHECKPOINT 5.1**: Confirm test project ready

- [ ] **5.2** Test --path flag workflows
  - [ ] Test `shopify hydrogen dev --path /tmp/test-hydrogen`
  - [ ] Verify auto-linking message appears
  - [ ] Test `shopify hydrogen build --path /tmp/test-hydrogen`
  - [ ] Test `shopify hydrogen codegen --path /tmp/test-hydrogen`
- [ ] **CHECKPOINT 5.2**: Confirm --path auto-linking works

### Phase 6: Testing - Negative Cases
- [ ] **6.1** Test skeleton template (should NOT link)
  - [ ] Run `cd templates/skeleton && npm run dev`
  - [ ] Verify NO auto-linking occurs
  - [ ] Verify dev server works normally
- [ ] **CHECKPOINT 6.1**: Confirm skeleton not affected

- [ ] **6.2** Test remote commands (should NOT link)
  - [ ] Test `shopify hydrogen list`
  - [ ] Test `shopify hydrogen login`
  - [ ] Test `shopify hydrogen env list`
  - [ ] Verify NO auto-linking occurs
- [ ] **CHECKPOINT 6.2**: Confirm remote commands unaffected

- [ ] **6.3** Test already linked scenario
  - [ ] Manually link a project
  - [ ] Run command again
  - [ ] Verify it detects already linked
  - [ ] Verify no duplicate linking
- [ ] **CHECKPOINT 6.3**: Confirm idempotency

### Phase 7: Performance & Edge Cases
- [ ] **7.1** Test performance impact
  - [ ] Measure command startup time without auto-linking
  - [ ] Measure command startup time with auto-linking
  - [ ] Ensure < 100ms overhead
- [ ] **CHECKPOINT 7.1**: Confirm acceptable performance

- [ ] **7.2** Test disable mechanism
  - [ ] Set `HYDROGEN_DISABLE_AUTOLINK=true`
  - [ ] Run commands that normally auto-link
  - [ ] Verify auto-linking is skipped
- [ ] **CHECKPOINT 7.2**: Confirm disable flag works

### Phase 8: Documentation & Cleanup
- [ ] **8.1** Update CLI README.md
  - [ ] Add auto-linking section
  - [ ] Document when it triggers
  - [ ] Document how to disable
  - [ ] Add troubleshooting guide
- [ ] **CHECKPOINT 8.1**: Review documentation

- [ ] **8.2** Add inline code documentation
  - [ ] Ensure all functions have JSDoc
  - [ ] Add examples in comments
  - [ ] Document environment variables
- [ ] **CHECKPOINT 8.2**: Review code comments

- [ ] **8.3** Clean up debug code
  - [ ] Remove unnecessary console.logs
  - [ ] Ensure debug output uses outputDebug
  - [ ] Test with --verbose flag
- [ ] **CHECKPOINT 8.3**: Final code review

### Phase 9: Final Validation
- [ ] **9.1** Full workflow test
  - [ ] Test complete development workflow
  - [ ] Test from clean state (no links)
  - [ ] Test all major commands
- [ ] **FINAL CHECKPOINT**: Approve for commit

## Success Criteria
- ✅ Examples work with `npm run` commands
- ✅ External projects auto-link with `--path`
- ✅ Skeleton template remains unaffected
- ✅ Remote commands don't trigger linking
- ✅ Performance overhead < 100ms
- ✅ Can be disabled via environment variable
- ✅ No modifications to command files

## Notes
- Each checkpoint requires manual validation before proceeding
- If any checkpoint fails, stop and reassess approach
- Keep all changes in a single commit for easy rollback