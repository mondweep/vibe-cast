
# Bug Report: API Inconsistencies, Shell Escaping, and Unsupported Flags in `AgentBrowserAdapter`

## Describe the bug
I encountered multiple issues while using the `@claude-flow/browser` package (v0.6.0) with the `agent-browser` CLI.

1.  **Method Naming Mismatch**: The documentation/types suggest `browser.evaluate()` but the implementation only has `browser.eval()`.
2.  **Critical Shell Escaping Issue**: The adapter uses `execSync` with string concatenation (`agent-browser ${fullArgs.join(' ')}`). This causes severe failures when passing complex JavaScript code to `eval` because special characters (like `(`, `)`, `;`) are interpreted by the shell.
    *   *Error observed*: `/bin/sh: -c: line 1: syntax error near unexpected token `)'`
3.  **Unsupported Flag Injection**: The adapter automatically injects a `--timeout` flag (defaulting to 30000), but the `agent-browser` CLI v0.6.0 rejects this flag with `Unknown command: --timeout`.
4.  **Return Value Wrapping**: `browser.eval()` returns a wrapper object `{ success: boolean, data: { result: any } }` instead of the direct result, which requires manual unwrapping.

## To Reproduce
Steps to reproduce the behavior:

1.  Initialize `BrowserService`.
2.  Attempt to run a complex evaluation script:
    ```typescript
    await browser.eval(`(() => { return { foo: 'bar' }; })()`);
    ```

## Expected behavior
1.  `evaluate` should alias to `eval` or be consistent.
2.  Complex JavaScript strings should be passed safely to the CLI without shell interpretation.
3.  No unsupported flags should be injected.

## Proposed Fixes
I locally patched `dist/infrastructure/agent-browser-adapter.js` to resolve these issues:

**1. Use `execFileSync` for safe execution:**
```javascript
import { execFileSync } from 'child_process';

// ... inside exec() method
const result = execFileSync('agent-browser', fullArgs, {
    encoding: 'utf-8',
    // timeout handling...
});
```

**2. Remove `--timeout` flag injection:**
The CLI does not support it, so it should be removed from the `fullArgs` array construction.

**3. Method Alias:**
Add an `evaluate` method that calls `eval`.
