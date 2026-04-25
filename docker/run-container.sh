#!/bin/bash
set -e

ARTIFACTORY_URL="artifactory.itg.ti.com"
REPO_NAME="docker-simplelink-connect-local"
IMAGE_NAME="simplelink-connect-build-apk"

# Parse arguments
CLEAN_CACHE=false
TAG=""

for arg in "$@"; do
  case $arg in
    --clean-cache)
      CLEAN_CACHE=true
      ;;
    *)
      TAG="$arg"
      ;;
  esac
done

# Require version tag
if [ -z "$TAG" ]; then
    echo "Error: Version tag required!"
    echo ""
    echo "Usage: $0 <version> [--clean-cache]"
    echo "Example: $0 20260201-143045"
    echo "Example: $0 20260201-143045 --clean-cache"
    exit 1
fi

FULL_IMAGE="${ARTIFACTORY_URL}/${REPO_NAME}/${IMAGE_NAME}:${TAG}"

# Clean cache volumes if requested
if [ "$CLEAN_CACHE" = true ]; then
    echo "Cleaning cache volumes..."
    docker volume rm gradle-cache 2>/dev/null && echo "✓ Gradle cache removed" || echo "✓ Gradle cache was empty"
    docker volume rm npm-cache 2>/dev/null && echo "✓ NPM cache removed" || echo "✓ NPM cache was empty"
    echo ""
fi

echo "========================================="
echo "SimpleLink Connect APK Builder"
echo "========================================="
echo "Using image: ${FULL_IMAGE}"
echo ""

# Note: If building image locally, run extract-build-versions.sh first
# This is handled automatically by push-to-artifactory.sh

# Check if image exists locally
if ! docker image inspect ${FULL_IMAGE} > /dev/null 2>&1; then
    echo "Image not found locally. Pulling from Artifactory..."

    # Check if logged in by attempting to pull
    # Docker will automatically use stored credentials from ~/.docker/config.json
    # Explicitly specify AMD64 platform for M1/M2/M3/M4 Mac compatibility (uses Rosetta 2)
    if ! docker pull --platform linux/amd64 ${FULL_IMAGE}; then
        echo ""
        echo "⚠ Failed to pull image from Artifactory!"
        echo ""
        echo "This could be because:"
        echo "  1. You're not logged in to Artifactory"
        echo "  2. You don't have access to the repository"
        echo "  3. The image doesn't exist yet"
        echo ""
        echo "To authenticate, run:"
        echo "  docker login ${ARTIFACTORY_URL}"
        echo ""
        echo "You'll need:"
        echo "  - Username: Your TI username"
        echo "  - Password: Your Artifactory API token (not your TI password)"
        echo ""
        echo "Get your API token from: https://artifactory.itg.ti.com/ui/"
        echo "(Profile → Edit Profile → Generate API Key)"
        echo ""
        echo "Note: Docker login uses username + API token for authentication"
        echo ""
        exit 1
    fi
    echo ""
fi

# Get the project root directory (parent of docker/)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Run the build
echo "Starting APK build..."
echo "Project root: ${PROJECT_ROOT}"
echo ""

docker run --rm \
  --platform linux/amd64 \
  -v "${PROJECT_ROOT}:/app" \
  -v gradle-cache:/root/.gradle \
  -v npm-cache:/root/.npm \
  -e HTTP_PROXY=http://webproxy.ext.ti.com:80 \
  -e HTTPS_PROXY=http://webproxy.ext.ti.com:80 \
  -e http_proxy=http://webproxy.ext.ti.com:80 \
  -e https_proxy=http://webproxy.ext.ti.com:80 \
  -e NO_PROXY=localhost,127.0.0.1 \
  -e no_proxy=localhost,127.0.0.1 \
  -e GRADLE_OPTS=-Dorg.gradle.daemon=false \
  --shm-size=2g \
  -w /app \
  ${FULL_IMAGE}

echo ""
echo "========================================="
echo "✓ APK build complete!"
echo "Location: android/app/build/outputs/apk/release/app-release.apk"
echo "========================================="
