# @nooma-tech/degit — straightforward project scaffolding

[![CI](https://github.com/Nooma-Tech/degit/actions/workflows/ci.yml/badge.svg)](https://github.com/Nooma-Tech/degit/actions/workflows/ci.yml)
[![npm package version](https://badgen.net/npm/v/@nooma-tech/degit)](https://npm.im/@nooma-tech/degit)
[![install size](https://badgen.net/packagephobia/install/@nooma-tech/degit)](https://packagephobia.now.sh/result?p=@nooma-tech/degit)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v1.4%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> **Note**: This is an enhanced and security-updated fork of the original [degit](https://github.com/Rich-Harris/degit) by Rich Harris. All credit goes to the original author for creating this amazing tool. This fork includes security updates, dependency upgrades, and modern tooling improvements.

**degit** makes copies of git repositories. When you run `degit some-user/some-repo`, it will find the latest commit on https://github.com/some-user/some-repo and download the associated tar file to `~/.degit/some-user/some-repo/commithash.tar.gz` if it doesn't already exist locally. (This is much quicker than using `git clone`, because you're not downloading the entire git history.)

_Requires Node 16 or above, because `async` and `await` are the cat's pyjamas_

## What's New in This Fork

- 🔒 **Security Updates**: All dependencies updated to secure versions
- 🚀 **Modern Node.js**: Updated to require Node 16+ with latest tooling
- 🔧 **Build Improvements**: Enhanced build process and CI/CD pipelines
- 📦 **NPM Organization**: Published under `@nooma-tech` scope
- ✅ **GitHub Actions**: Modern CI/CD with automated releases
- 🎯 **Template System**: Interactive prompts, variable substitution, and file operations
- 🔐 **Enhanced Git Support**: SSH and HTTPS modes for private repositories
- 📋 **Advanced Actions**: Complete scaffolding solution with template processing

## Installation

```bash
npm install -g @nooma-tech/degit
```

Or use the original package:
```bash
npm install -g degit
```

## Usage

### Basics

The simplest use of degit is to download the master branch of a repo from GitHub to the current working directory:

```bash
degit user/repo

# these commands are equivalent
degit github:user/repo
degit git@github.com:user/repo
degit https://github.com/user/repo
```

Or you can download from GitLab and BitBucket:

```bash
# download from GitLab
degit gitlab:user/repo
degit git@gitlab.com:user/repo
degit https://gitlab.com/user/repo

# download from BitBucket
degit bitbucket:user/repo
degit git@bitbucket.org:user/repo
degit https://bitbucket.org/user/repo

# download from Sourcehut
degit git.sr.ht/user/repo
degit git@git.sr.ht:user/repo
degit https://git.sr.ht/user/repo
```

### Specify a tag, branch or commit

The default branch is `master`.

```bash
degit user/repo#dev       # branch
degit user/repo#v1.2.3    # release tag
degit user/repo#1234abcd  # commit hash
````

### Create a new folder for the project

If the second argument is omitted, the repo will be cloned to the current directory.

```bash
degit user/repo my-new-project
```

### Specify a subdirectory

To clone a specific subdirectory instead of the entire repo, just add it to the argument:

```bash
degit user/repo/subdirectory
```

### HTTPS proxying

If you have an `https_proxy` environment variable, Degit will use it.

### Private repositories

Private repos can be cloned using Git modes instead of the default `tar` mode:

**SSH Mode (requires SSH keys):**
```bash
degit --mode=git user/private-repo        # or --mode=git-ssh
degit --mode=git-ssh user/private-repo
```

**HTTPS Mode (uses local Git credentials):**
```bash
degit --mode=git-https user/private-repo
```

Git modes are slower than fetching a tarball, which is why `tar` remains the default for public repositories.

### See all options

```bash
degit --help
```

## Enhanced Features

- ✅ **Private repositories** - Now supported via `--mode=git-ssh` or `--mode=git-https`
- ✅ **Multiple Git authentication methods** - SSH keys or HTTPS credentials
- ✅ **Interactive template system** - Prompts, variables, and dynamic scaffolding
- ✅ **Advanced file operations** - Template processing, renaming, and content replacement
- ✅ **Complete scaffolding solution** - Transform templates into ready-to-use projects
- ✅ **Security updates** - All dependencies updated to secure versions
- ✅ **Modern tooling** - GitHub Actions CI/CD, Dependabot v2, ESLint 8.x

Pull requests are very welcome!

## Wait, isn't this just `git clone --depth 1`?

A few salient differences:

- If you `git clone`, you get a `.git` folder that pertains to the project template, rather than your project. You can easily forget to re-init the repository, and end up confusing yourself
- Caching and offline support (if you already have a `.tar.gz` file for a specific commit, you don't need to fetch it again).
- Less to type (`degit user/repo` instead of `git clone --depth 1 git@github.com:user/repo`)
- Composability via [actions](#actions)
- ✅ **Interactive mode** — Template prompts and variable collection
- ✅ **Advanced scaffolding** — Template processing, file renaming, and project setup automation

## JavaScript API

You can also use degit inside a Node script:

```js
const degit = require('@nooma-tech/degit');

const emitter = degit('user/repo', {
	cache: true,
	force: true,
	verbose: true,
});

emitter.on('info', info => {
	console.log(info.message);
});

emitter.clone('path/to/dest').then(() => {
	console.log('done');
});
```

## Actions

You can manipulate repositories after they have been cloned with _actions_, specified in a `degit.json` file that lives at the top level of the working directory. The following actions are supported:

### Template Actions (NEW!)

#### prompt

Interactive prompts for collecting template variables:

```json
{
  "action": "prompt",
  "message": "Configure your project",
  "variables": [
    {
      "name": "SERVICE_NAME",
      "message": "Enter service name:",
      "type": "input"
    },
    {
      "name": "AUTH_TYPE", 
      "message": "Choose authentication:",
      "type": "select",
      "choices": ["OAuth2", "API Key", "Basic Auth"]
    }
  ]
}
```

#### template

Text replacement with template variables:

```json
{
  "action": "template",
  "replacements": [
    {
      "from": "ExampleService",
      "to": "{{SERVICE_NAME}}"
    }
  ],
  "extensions": [".js", ".ts", ".json", ".md"]
}
```

#### rename

File and directory renaming with template support:

```json
{
  "action": "rename", 
  "files": [
    {
      "from": "**/*.tmpl",
      "to": "**/*"
    },
    {
      "from": "ExampleService.js",
      "to": "{{SERVICE_NAME}}.js"
    }
  ]
}
```

## Complete Template Example

Here's a complete example of a `degit.json` for a project template:

```json
[
  {
    "action": "prompt",
    "message": "🚀 Configure your project",
    "variables": [
      {
        "name": "PROJECT_NAME",
        "message": "Enter project name:",
        "type": "input"
      },
      {
        "name": "AUTHOR_NAME", 
        "message": "Enter author name:",
        "type": "input",
        "default": "Your Name"
      },
      {
        "name": "LICENSE_TYPE",
        "message": "Choose license:",
        "type": "select",
        "choices": ["MIT", "Apache-2.0", "GPL-3.0"]
      }
    ]
  },
  {
    "action": "template",
    "replacements": [
      {
        "from": "PLACEHOLDER_NAME",
        "to": "{{PROJECT_NAME}}"
      },
      {
        "from": "PLACEHOLDER_AUTHOR",
        "to": "{{AUTHOR_NAME}}"
      }
    ],
    "extensions": [".js", ".ts", ".json", ".md", ".yml"]
  },
  {
    "action": "rename",
    "files": [
      {
        "from": "**/*.tmpl",
        "to": "**/*"
      },
      {
        "from": "src/PLACEHOLDER_NAME.js",
        "to": "src/{{PROJECT_NAME}}.js"
      }
    ]
  },
  {
    "action": "remove",
    "files": [
      "degit.json",
      "template.config.json",
      ".template"
    ]
  }
]
```

#### script / preScript / postScript

Execute shell commands during scaffolding:

```json
{
  "action": "preScript",
  "message": "Setting up development environment...",
  "commands": [
    "npm install",
    "git init",
    "git add .",
    "git commit -m 'Initial commit for {{PROJECT_NAME}}'"
  ],
  "workingDirectory": ".",
  "failOnError": true
}
```

```json
{
  "action": "postScript", 
  "message": "Finalizing project setup...",
  "commands": [
    "npm run build",
    "npm test",
    "echo 'Project {{PROJECT_NAME}} is ready!'"
  ],
  "failOnError": false
}
```

### clone

```json
// degit.json
[
	{
		"action": "clone",
		"src": "user/another-repo"
	}
]
```

This will clone `user/another-repo`, preserving the contents of the existing working directory. This allows you to, say, add a new README.md or starter file to a repo that you do not control. The cloned repo can contain its own `degit.json` actions.

### remove

```json
// degit.json
[
	{
		"action": "remove",
		"files": ["LICENSE"]
	}
]
```

Remove a file at the specified path.

## See also

- [zel](https://github.com/vutran/zel) by [Vu Tran](https://twitter.com/tranvu)
- [gittar](https://github.com/lukeed/gittar) by [Luke Edwards](https://twitter.com/lukeed05)

## License

[MIT](LICENSE.md).
