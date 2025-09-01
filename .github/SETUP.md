# GitHub Actions Setup Guide

This document explains how to configure the GitHub repository for automated NPM publishing and CI/CD.

## Required GitHub Secrets

To enable automated NPM publishing when creating new tags, you need to configure the following secret in your GitHub repository:

### NPM_TOKEN

1. **Generate NPM Access Token**:
   - Go to [npmjs.com](https://www.npmjs.com/) and log in to your account
   - Click on your profile picture → "Access Tokens"
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type (for CI/CD publishing)
   - Copy the generated token

2. **Add to GitHub Secrets**:
   - Go to your GitHub repository: `https://github.com/Nooma-Tech/degit`
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste the NPM token you generated
   - Click "Add secret"

## NPM Organization Setup

Make sure the `@nooma-tech` organization exists on NPM and you have publishing permissions:

1. **Create Organization** (if not exists):
   ```bash
   npm org create nooma-tech
   ```

2. **Add Members** (if needed):
   ```bash
   npm org set nooma-tech <username> developer
   ```

3. **Verify Permissions**:
   ```bash
   npm org ls nooma-tech
   ```

## Publishing Process

### Automatic Publishing (Recommended)

The repository is configured to automatically publish to NPM when you create a new tag:

```bash
# Create and push a new tag
git tag v2.8.5
git push origin v2.8.5
```

This will trigger the release workflow that will:
1. Run tests and build the project
2. Create a GitHub release
3. Publish to NPM as `@nooma-tech/degit`

### Manual Publishing

If you need to publish manually:

```bash
# Make sure you're logged in to NPM
npm login

# Build the project
npm run build

# Publish
npm publish
```

## Workflow Files

- **`.github/workflows/ci.yml`**: Runs tests on every push and PR
- **`.github/workflows/release.yml`**: Handles releases and NPM publishing on tag creation
- **`.github/dependabot.yml`**: Keeps dependencies up to date

## Branch Protection

Consider setting up branch protection rules for the `master` branch:

1. Go to Settings → Branches
2. Add rule for `master` branch
3. Enable:
   - "Require status checks to pass before merging"
   - "Require branches to be up to date before merging"
   - Select the CI workflow as required status check

## Team Configuration

If you're working with a team, make sure to:

1. Create a `@nooma-tech/maintainers` team on GitHub
2. Add team members who should review Dependabot PRs
3. Grant the team appropriate permissions to the repository

## Troubleshooting

### NPM Publishing Fails

- Verify the `NPM_TOKEN` secret is correctly set
- Check that you have publishing permissions to `@nooma-tech` organization
- Ensure the package version in `package.json` hasn't been published before

### CI Fails

- Check Node.js version compatibility (requires Node 16+)
- Verify all dependencies are properly installed
- Review test failures in the Actions tab

### Dependabot Issues

- Ensure the `@nooma-tech/maintainers` team exists
- Check that Dependabot has proper permissions
- Review ignored dependencies in `.github/dependabot.yml`
