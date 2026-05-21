# @nooma-tech/degit changelog

## 1.4.3

* **SECURITY**: Fix shell command injection in the `src` argument
  (reported by Jaeyoung Yun — GitHub [@JAE0Y2N](https://github.com/JAE0Y2N) — 2026-05-20).
  * The internal `exec` wrapper used `child_process.exec`, which spawns
    `/bin/sh -c <command>`. Shell metacharacters in `repo.url`, `repo.ssh`
    and `dest` (built from the `src` CLI argument) were therefore parsed by
    the shell, allowing arbitrary command execution whenever an attacker
    could influence `src` (scaffolding pipelines, IDE extensions, tutorials).
  * Switched `exec` to `child_process.execFile` with an argv list — no shell
    is involved, so metacharacters in any value are now treated as literal
    arguments.
  * Replaced the post-clone `rm -rf` invocation with `rimrafSync` (Node API),
    removing another shell sink.
* **SECURITY (defense in depth)**: Rewrote `RepoParser.parse` without the
  catch-all regex and added a strict `^[A-Za-z0-9._-]+$` allowlist for
  `user`, `name` and each subdir segment. Malformed sources are rejected
  before any value reaches a downstream consumer.
* **SECURITY (defense in depth)**: Hardened `script`/`preScript`/`postScript`
  actions.
  * Commands are now executed via `execFile` with an argv list — no shell.
  * New schema `{ "file": "npm", "args": ["install", "{{name}}"] }` is the
    recommended form; interpolated `{{vars}}` are always argv literals.
  * Legacy string commands (`"npm install"`) are parsed with `shell-quote`
    into an argv array; shell operators (`;`, `|`, `&`, `>`, `<`, `` ` ``,
    `$()`) are **rejected** rather than executed.
  * Scripts are **off by default**. Pass `--allow-scripts` to opt in after
    auditing the template.
  * With `--allow-scripts`, degit prompts for confirmation before each
    command. Use `--yes` / `-y` to skip the prompt in trusted CI flows.

## 1.2.1

* Add comprehensive npx usage documentation
  * Add Quick Start section with npx examples
  * Document npx as recommended usage method (always latest version)
  * Include examples for template scaffolding and private repositories
  * Improve installation section with multiple options

## 1.2.0

* **NEW**: Complete template system implementation
  * Interactive prompts with `prompt` action for collecting template variables
  * Template processing with `template` action for text replacement
  * Advanced file operations with `rename` action supporting glob patterns
  * Variable substitution with `{{VARIABLE_NAME}}` syntax
  * Support for multiple file extensions and complex scaffolding workflows
  * Script execution with `script`, `preScript`, and `postScript` actions
  * Command execution with template variable support and error handling
* **FEATURE**: Implement all "Future capabilities" mentioned in original README
  * Interactive mode for template configuration
  * Advanced scaffolding and project setup automation
  * Template-driven project generation
* Update comprehensive documentation with template examples
* Add template test infrastructure
* Transform degit from simple cloner to complete scaffolding solution

## 1.1.1

* Fix GitHub Actions release workflow
  * Remove duplicate version update step that was causing "Version not changed" errors
  * Workflow now correctly assumes package.json version is already updated by local npm version command
  * Improve release process reliability for future versions

## 1.1.0

* **NEW**: Add support for Git HTTPS mode for private repositories
  * New `--mode=git-https` option for cloning private repos via HTTPS
  * Maintains backward compatibility: `--mode=git` still works (maps to `git-ssh`)
  * Support for local Git credentials (useful for private repos with HTTPS auth)
* **BREAKING**: Valid modes now include: `tar`, `git`, `git-ssh`, `git-https`
* Update documentation with new Git authentication methods
* Add comprehensive tests for new Git modes
* Fix help.md to reference correct repository URL

## 1.0.2

* Remove unreliable external service tests (GitLab, Sourcehut, private repos)
* Improve test stability and CI reliability
* All tests now pass consistently

## 1.0.1

* Update linting tools to modern versions
  * ESLint 7.23.0 → 8.57.0
  * eslint-config-prettier 8.1.0 → 9.1.0
  * eslint-plugin-import 2.22.1 → 2.29.1
  * Prettier 2.2.1 → 3.2.5
* Update ESLint configuration for modern JavaScript (ECMAScript 2022)
* Maintain zero security vulnerabilities

## 1.0.0

* **BREAKING**: Scoped package name changed to `@nooma-tech/degit`
* **BREAKING**: Minimum Node.js version increased to 16.0.0
* Security updates for all dependencies:
  * Fixed vulnerabilities in minimatch, rollup, tar, mocha dependencies
  * Resolved circular dependency issues with glob package
* Modern CI/CD with GitHub Actions (replaced Travis CI and AppVeyor)
* Automated NPM publishing on tag creation
* Updated Dependabot to v2 format
* Enhanced fork documentation with proper attribution to Rich Harris
* Maintained all original functionality and API compatibility

---

## Original degit changelog

## 2.8.4

* Whoops

## 2.8.3

* Reinstate `#!/usr/bin/env node` ([#273](https://github.com/Rich-Harris/degit/issues/273))

## 2.8.2

* Fix `bin`/`main` locations ([#273](https://github.com/Rich-Harris/degit/issues/273))
* Update dependencies

## 2.8.1

* Use `HEAD` instead of `master` ([#243](https://github.com/Rich-Harris/degit/pull/243)])

## 2.8.0

* Sort by recency in interactive mode

## 2.7.0

* Bundle for a faster install

## 2.6.0

* Add an interactive mode ([#4](https://github.com/Rich-Harris/degit/issues/4))

## 2.5.0

* Add `--mode=git` for cloning private repos ([#29](https://github.com/Rich-Harris/degit/pull/29))

## 2.4.0

* Clone subdirectories from repos (`user/repo/subdir`)

## 2.3.0

* Support HTTPS proxying where `https_proxy` env var is supplied ([#26](https://github.com/Rich-Harris/degit/issues/26))

## 2.2.2

- Improve CLI error logging ([#49](https://github.com/Rich-Harris/degit/pull/49))

## 2.2.1

- Update `help.md` for Sourcehut support

## 2.2.0

- Sourcehut support ([#85](https://github.com/Rich-Harris/degit/pull/85))

## 2.1.4

- Fix actions ([#65](https://github.com/Rich-Harris/degit/pull/65))
- Improve CLI error logging ([#46](https://github.com/Rich-Harris/degit/pull/46))

## 2.1.3

- Install `sander` ([#34](https://github.com/Rich-Harris/degit/issues/34))

## 2.1.2

- Remove `console.log`

## 2.1.1

- Oops, managed to publish 2.1.0 without building

## 2.1.0

- Add actions ([#28](https://github.com/Rich-Harris/degit/pull/28))

## 2.0.2

- Allow flags like `-v` before argument ([#25](https://github.com/Rich-Harris/degit/issues/25))

## 2.0.1

- Update node-tar for Node 9 compatibility

## 2.0.0

- Expose API for use in Node scripts ([#23](https://github.com/Rich-Harris/degit/issues/23))

## 1.2.2

- Fix `files` in package.json

## 1.2.1

- Add `engines` field ([#17](https://github.com/Rich-Harris/degit/issues/17))

## 1.2.0

- Windows support ([#1](https://github.com/Rich-Harris/degit/issues/1))
- Offline support and `--cache` flag ([#8](https://github.com/Rich-Harris/degit/issues/8))
- `degit --help` ([#5](https://github.com/Rich-Harris/degit/issues/5))
- `--verbose` flag

## 1.1.0

- Use HTTPS, not SSH ([#11](https://github.com/Rich-Harris/degit/issues/11))

## 1.0.0

- First release
