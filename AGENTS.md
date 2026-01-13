# AGENTS.md - Predicte Commit VS Code Extension

This document provides guidelines for agentic coding assistants working on the Predicte Commit VS Code extension.

## Project Overview

Predicte Commit is a VS Code extension for AI-generated commit messages. The project uses TypeScript, esbuild for bundling, and follows VS Code extension development patterns.

## Build Commands

### Development
- `npm run compile` - Compile TypeScript, run linting, and build with esbuild
- `npm run watch` - Watch mode for development (runs esbuild and tsc in parallel)
- `npm run watch:esbuild` - Watch mode for esbuild only
- `npm run watch:tsc` - Watch mode for TypeScript type checking only

### Production
- `npm run package` - Production build (minified, no sourcemaps)
- `npm run vscode:prepublish` - Alias for package command

### Type Checking & Linting
- `npm run check-types` - TypeScript type checking only (no emit)
- `npm run lint` - ESLint checking on src directory

## Testing Commands

### Running Tests
- `npm test` - Run all tests (compiles tests, runs linting, then executes tests)
- `npm run pretest` - Prepare tests (compile tests, compile extension, run lint)
- `npm run compile-tests` - Compile test files to out directory
- `npm run watch-tests` - Watch mode for test compilation

### Running Single Test
To run a single test file, use the vscode-test CLI directly:
```bash
npx @vscode/test-cli run --file out/test/extension.test.js
```

Test files are compiled to `out/test/` directory. The test configuration is in `.vscode-test.mjs`.

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: Node16
- Strict mode: Enabled
- Source maps: Enabled in development
- Root directory: `src/`

### Imports
- Use ES module imports: `import * as vscode from 'vscode';`
- Group imports: VS Code API first, then internal modules
- Use absolute imports from `src/` directory
- Import only what you need (avoid wildcard imports when possible)

### Naming Conventions
- **Variables & functions**: camelCase
- **Classes & types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE or camelCase with `const`
- **Interfaces**: PascalCase (no `I` prefix)
- **Files**: kebab-case for test files, camelCase for regular files

### Formatting
- **Semicolons**: Required (ESLint rule: `semi: "warn"`)
- **Quotes**: Double quotes for strings (based on existing code)
- **Indentation**: 1 tab = 4 spaces (VS Code default)
- **Curly braces**: Required for all control structures (ESLint rule: `curly: "warn"`)
- **Equality**: Use strict equality (`===`/`!==`) (ESLint rule: `eqeqeq: "warn"`)

### Error Handling
- Use `try/catch` blocks for async operations
- Throw Error objects, not strings or literals (ESLint rule: `no-throw-literal: "warn"`)
- Log errors to console with `console.error()` for debugging
- Use VS Code's notification system (`vscode.window.showErrorMessage`) for user-facing errors

### VS Code Extension Patterns
1. **Activation**: Use `activate()` function exported from main module
2. **Commands**: Register in `package.json` and implement in extension
3. **Context**: Use `vscode.ExtensionContext` for subscriptions
4. **Disposal**: Add disposables to `context.subscriptions`
5. **Logging**: Use `console.log` for activation/debug messages

### File Structure
```
src/
  extension.ts          # Main extension entry point
  test/                 # Test files
    extension.test.ts   # Test suite
dist/                  # Built extension (generated)
out/                   # Compiled tests (generated)
```

### ESLint Rules
- `@typescript-eslint/naming-convention`: camelCase/PascalCase for imports
- `curly`: Require curly braces
- `eqeqeq`: Require strict equality
- `no-throw-literal`: Throw Error objects only
- `semi`: Require semicolons

### Build Configuration
- **Bundler**: esbuild (configured in `esbuild.js`)
- **External**: `vscode` module is external
- **Sourcemaps**: Enabled in development, disabled in production
- **Minification**: Enabled in production builds

## Development Workflow

1. **Start development**: `npm run watch`
2. **Check types**: `npm run check-types`
3. **Run linting**: `npm run lint`
4. **Test changes**: `npm test`
5. **Package for release**: `npm run package`

## Testing Strategy
- Tests use VS Code's test runner (`@vscode/test-electron`)
- Test files are in `src/test/` directory
- Tests compile to `out/test/` directory
- Use `assert` module for assertions
- Follow VS Code extension testing patterns

## Notes for Agents
- This is a VS Code extension - follow VS Code API patterns
- Keep bundle size small (esbuild minifies for production)
- All source code belongs in `src/` directory
- Generated files go to `dist/` (extension) and `out/` (tests)
- Check package.json scripts for available commands
- Run linting and type checking before committing changes