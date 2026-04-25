#!/bin/bash
set -e

# Get the project root directory (parent of docker/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ARTIFACTORY_URL="artifactory.itg.ti.com"
REPO_NAME="docker-simplelink-connect-local"
IMAGE_NAME="simplelink-connect-build-apk"

# Generate timestamp-based version (YYYYMMDD-HHMMSS format)
if [ -z "$1" ]; then
    # Auto-generate timestamp-based version to avoid manifest conflicts
    VERSION=$(date +"%Y%m%d-%H%M%S")
    echo "Auto-generated timestamp-based version: ${VERSION}"
else
    # Use provided version argument (for testing/manual override)
    VERSION="$1"
    echo "Using provided version: ${VERSION}"
fi

FULL_IMAGE_VERSIONED="${ARTIFACTORY_URL}/${REPO_NAME}/${IMAGE_NAME}:${VERSION}"

echo "========================================="
echo "Docker Image Push to TI Artifactory"
echo "========================================="
echo "Target: ${FULL_IMAGE_VERSIONED}"
echo ""

# Check if logged in
echo "Checking authentication..."
if ! docker info 2>/dev/null | grep -q "artifactory.itg.ti.com"; then
    echo "Not logged in to Artifactory. Running docker login..."
    docker login ${ARTIFACTORY_URL}
fi

# Extract and update build versions from app/build.gradle
echo ""
echo "Extracting build versions from android/app/build.gradle..."
if ! "${SCRIPT_DIR}/extract-build-versions.sh"; then
    echo "Error: Failed to extract build versions"
    exit 1
fi

# Build the image
echo ""
echo "Building Docker image..."
cd "${SCRIPT_DIR}"
docker build \
  --platform linux/amd64 \
  --build-arg HTTP_PROXY=http://webproxy.ext.ti.com:80 \
  --build-arg HTTPS_PROXY=http://webproxy.ext.ti.com:80 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t ${FULL_IMAGE_VERSIONED} \
  -f Dockerfile \
  ..

# Push versioned tag to Artifactory
echo ""
echo "Pushing to Artifactory..."
docker push ${FULL_IMAGE_VERSIONED}

echo ""
echo "========================================="
echo "✓ Successfully pushed to Artifactory!"
echo "========================================="
echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                          🏷️  IMAGE TAG BUILT                              ║"
echo "╠═══════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                           ║"
echo "║   ${VERSION}"
echo "║                                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Full image: ${FULL_IMAGE_VERSIONED}"
echo ""
echo "Team members can now pull with:"
echo "  docker pull ${FULL_IMAGE_VERSIONED}"
echo "========================================="
