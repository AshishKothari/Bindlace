# Contributing to JSON-Driven UI Automation

## Philosophy
We follow the **"15+ Year Architect"** standard.
1.  **Strict Types**: No `any` allowed.
2.  **Build First**: Always run `npm run build` before pushing.
3.  **Docs**: Update JSDoc for any new interface.

## Adding a New Driver
1.  Implement `IAutomationDriver` in `src/core/drivers/your-driver/`.
2.  Register it in `DriverFactory`.
3.  Add unit tests.
