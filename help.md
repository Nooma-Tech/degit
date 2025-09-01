# _degit_

Usage:

`degit <src>[#ref] [<dest>] [options]`

Fetches the `src` repo, and extracts it to `dest` (or the current directory).

The `src` argument can be any of the following:

## GitHub repos

user/repo
github:user/repo
https://github.com/user/repo

## GitLab repos

gitlab:user/repo
https://gitlab.com/user/repo

## BitBucket repos

bitbucket:user/repo
https://bitbucket.com/user/repo

## Sourcehut repos

git.sr.ht/user/repo
git@git.sr.ht:user/repo
https://git.sr.ht/user/repo

You can append a #ref to any of the above:

## Branches (defaults to master)

user/repo#dev

## Tags

user/repo#v1.2.3

## Commit hashes

user/repo#abcd1234

The `dest` directory (or the current directory, if unspecified) must be empty
unless the `--force` option is used.

Options:

  `--help`,    `-h`  Show this message
  `--cache`,   `-c`  Only use local cache
  `--force`,   `-f`  Allow non-empty destination directory
  `--verbose`, `-v`  Extra logging
  `--mode=`,   `-m=` Force the mode by which degit clones the repo
                     Valid options are:
                     - `tar` (default): Download via tarball
                     - `git` or `git-ssh`: Clone via SSH (for private repos with SSH keys)
                     - `git-https`: Clone via HTTPS (for private repos with local Git credentials)

## Template Actions

degit supports advanced template processing via `degit.json` actions:

- `prompt`: Interactive prompts for template variables
- `template`: Text replacement with variables
- `rename`: File/directory renaming with template support
- `remove`: File/directory removal
- `clone`: Clone additional repositories
- `script`: Execute shell commands
- `preScript`: Execute commands before other actions
- `postScript`: Execute commands after all actions

See https://github.com/Nooma-Tech/degit for more information
