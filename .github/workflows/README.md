# GitHub Actions Workflows

This directory contains GitHub Actions workflows for Docker image management using GitHub Container Registry (GHCR).

## Workflows Overview

### 1. Reusable Docker Build (`docker-build.yml`)

- Reusable workflow for Docker builds
- Supports caching and multi-platform builds
- Used by other workflows

## Docker Image Tags

Images are tagged based on the trigger:

- **Branch push**: `{branch}`, `{branch}-{sha}`
- **Pull request**: `pr-{number}`
- **Main branch**: `latest`, `main-{sha}`
- **Release tags**: `v1.0.0`, `1.0`, `1`, `latest`

## Using GHCR Images

### Local Development

```bash
# Pull latest images
docker pull ghcr.io/{owner}/{repo}-backend:latest
docker pull ghcr.io/{owner}/{repo}-frontend:latest

# Run with docker-compose
docker-compose -f docker-compose.yml up
```

### Using Specific Versions

```bash
# Use a specific release
docker pull ghcr.io/{owner}/{repo}-backend:v1.0.0
docker pull ghcr.io/{owner}/{repo}-frontend:v1.0.0
```

### Authentication

To pull images from GHCR:

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# For public repositories, no authentication needed for pulling
```

## Environment Variables

Required secrets in GitHub repository settings:

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- No additional secrets needed for GHCR push

## Customizing Workflows

### Modify Build Platforms

Edit the `platforms` field in build steps:

```yaml
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

### Add Build Arguments

```yaml
build-args: |
  VERSION=${{ github.sha }}
  BUILD_DATE=${{ steps.date.outputs.date }}
```

### Change Image Retention

Configure in repository settings:

- Settings → Packages → Container retention policy

## Troubleshooting

### Permission Denied

Ensure workflows have package write permissions:

```yaml
permissions:
  contents: read
  packages: write
```

### Image Not Found

Check image visibility:

- Public repositories: Images are public by default
- Private repositories: Configure package visibility in settings

### Build Cache

Workflows use GitHub Actions cache:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```
