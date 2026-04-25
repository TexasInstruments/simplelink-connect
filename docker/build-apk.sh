#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  SimpleLink Connect APK Builder"
echo "========================================"
echo ""

# Verify we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Make sure project is mounted at /app${NC}"
    exit 1
fi

# Step 1: Clean Gradle lock files from previous interrupted builds
echo -e "${YELLOW}[1/4] Cleaning Gradle lock files...${NC}"
find /root/.gradle -type f -name "*.lock" -delete 2>/dev/null || true
echo -e "${GREEN}Gradle lock files cleaned${NC}"
echo ""

# Step 2: Configure Android SDK path for container
echo -e "${YELLOW}[2/4] Configuring Android SDK...${NC}"
cat > android/local.properties << EOF
sdk.dir=/opt/android-sdk
EOF
echo -e "${GREEN}SDK configured${NC}"
echo ""

# Step 3: Install npm dependencies
echo -e "${YELLOW}[3/4] Installing npm dependencies...${NC}"
npm install --loglevel verbose

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: npm install failed${NC}"
    exit 1
fi
echo -e "${GREEN}Dependencies installed${NC}"
echo ""

# Step 4: Build release APK
echo -e "${YELLOW}[4/4] Building release APK...${NC}"
cd android
./gradlew assembleRelease --no-daemon --no-build-cache --max-workers=2 --stacktrace

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Gradle build failed${NC}"
    exit 1
fi
echo -e "${GREEN}Build completed${NC}"
echo ""

# Verify APK
echo -e "${YELLOW}Verifying APK...${NC}"
APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${GREEN}========================================"
    echo "  BUILD SUCCESSFUL!"
    echo "========================================"
    echo ""
    echo "APK: android/app/build/outputs/apk/release/app-release.apk"
    echo "Size: $APK_SIZE"
    echo ""
    echo "Install command:"
    echo "  adb install -r android/app/build/outputs/apk/release/app-release.apk"
    echo -e "========================================${NC}"
else
    echo -e "${RED}Error: APK not found at expected location${NC}"
    exit 1
fi
