#!/bin/bash
# Extract Android build versions from app/build.gradle and update Dockerfile
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_BUILD_GRADLE="${PROJECT_ROOT}/android/app/build.gradle"
DOCKERFILE="${SCRIPT_DIR}/Dockerfile"

echo "========================================="
echo "Extracting Android Build Versions"
echo "========================================="
echo ""

# Check if app/build.gradle exists
if [ ! -f "$APP_BUILD_GRADLE" ]; then
    echo "Error: Could not find ${APP_BUILD_GRADLE}"
    exit 1
fi

# Extract versions from app/build.gradle
echo "Reading versions from: android/app/build.gradle"
echo ""

# Extract NDK version (compatible with both GNU and BSD grep)
NDK_VERSION=$(grep "ndkVersion" "$APP_BUILD_GRADLE" | sed -E "s/.*['\"]([0-9.]+)['\"].*/\1/" | head -1)
if [ -z "$NDK_VERSION" ]; then
    echo "Warning: Could not detect NDK version, using default"
    NDK_VERSION="26.1.10909125"
fi
echo "  NDK Version:        $NDK_VERSION"

# Extract buildToolsVersion (compatible with both GNU and BSD grep)
BUILD_TOOLS=$(grep "buildToolsVersion" "$APP_BUILD_GRADLE" | sed -E "s/.*['\"]([0-9.]+)['\"].*/\1/" | head -1)
if [ -z "$BUILD_TOOLS" ]; then
    echo "Warning: Could not detect buildToolsVersion, using default"
    BUILD_TOOLS="35.0.0"
fi
echo "  Build Tools:        $BUILD_TOOLS"

# Extract compileSdk (compatible with both GNU and BSD grep)
COMPILE_SDK=$(grep "compileSdk" "$APP_BUILD_GRADLE" | sed -E "s/.*compileSdk[^0-9]*([0-9]+).*/\1/" | head -1)
if [ -z "$COMPILE_SDK" ]; then
    echo "Warning: Could not detect compileSdk, using default"
    COMPILE_SDK="35"
fi
echo "  Compile SDK:        $COMPILE_SDK"

echo ""
echo "========================================="
echo "Updating Dockerfile"
echo "========================================="
echo ""

# Extract existing platforms and build-tools from Dockerfile
echo "Extracting existing SDK versions from Dockerfile..."
EXISTING_PLATFORMS=$(grep -E '^\s*"platforms;android-' "$DOCKERFILE" | sed -E 's/.*android-([0-9]+).*/\1/' | sort -u)
EXISTING_BUILD_TOOLS=$(grep -E '^\s*"build-tools;' "$DOCKERFILE" | sed -E 's/.*build-tools;([0-9.]+).*/\1/' | sort -u)

echo "  Existing platforms: ${EXISTING_PLATFORMS:-none}"
echo "  Existing build-tools: ${EXISTING_BUILD_TOOLS:-none}"
echo ""

# Merge detected versions with existing ones
ALL_PLATFORMS=$(echo -e "${EXISTING_PLATFORMS}\n${COMPILE_SDK}" | sort -u | sort -n)
ALL_BUILD_TOOLS=$(echo -e "${EXISTING_BUILD_TOOLS}\n${BUILD_TOOLS}" | sort -u -V)

echo "Merged SDK versions:"
echo "  Platforms: ${ALL_PLATFORMS}"
echo "  Build tools: ${ALL_BUILD_TOOLS}"
echo ""

# Create a temporary file for the updated Dockerfile
TEMP_DOCKERFILE="${DOCKERFILE}.tmp"

# Build the platforms and build-tools lines
PLATFORMS_LINES=""
for platform in $ALL_PLATFORMS; do
    PLATFORMS_LINES="${PLATFORMS_LINES}        \"platforms;android-${platform}\" \\\\\n"
done

BUILD_TOOLS_LINES=""
for bt in $ALL_BUILD_TOOLS; do
    BUILD_TOOLS_LINES="${BUILD_TOOLS_LINES}        \"build-tools;${bt}\" \\\\\n"
done

# Use awk to replace the sdkmanager section with merged versions
awk -v ndk="$NDK_VERSION" -v platforms="$PLATFORMS_LINES" -v buildtools="$BUILD_TOOLS_LINES" '
/^RUN yes.*sdkmanager --licenses/ {
    # Print the first 3 lines of the RUN command (RUN, sdkmanager --update, sdkmanager)
    print $0
    getline
    print $0
    getline
    print $0
    # Now print the updated package list with all platforms and build-tools
    printf "%s", platforms
    printf "%s", buildtools
    print "        \"ndk;" ndk "\" \\"
    print "        \"platform-tools\""
    # Skip old package lines until we hit an empty line or new section
    while ((getline > 0) && (NF > 0) && !/^RUN/ && !/^#/) {
        # Skip these lines
    }
    # Print the empty line or next section start
    if (NF == 0 || /^RUN/ || /^#/) print $0
    next
}
{print}
' "$DOCKERFILE" > "$TEMP_DOCKERFILE"

# Check if changes were made
if diff -q "$DOCKERFILE" "$TEMP_DOCKERFILE" > /dev/null 2>&1; then
    echo "No changes needed - Dockerfile already up to date"
    rm "$TEMP_DOCKERFILE"
else
    # Show the diff
    echo "Changes to be applied:"
    echo "---"
    diff "$DOCKERFILE" "$TEMP_DOCKERFILE" || true
    echo "---"
    echo ""

    # Apply changes
    mv "$TEMP_DOCKERFILE" "$DOCKERFILE"
    echo "✓ Dockerfile updated successfully!"
    echo ""
    echo "Updated SDK components:"
    for platform in $ALL_PLATFORMS; do
        echo "  - platforms;android-${platform}"
    done
    for bt in $ALL_BUILD_TOOLS; do
        echo "  - build-tools;${bt}"
    done
    echo "  - ndk;${NDK_VERSION}"
fi

echo ""
echo "========================================="
echo "Done!"
echo "========================================="
