# @nooma-tech/degit changelog

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
