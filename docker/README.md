# Docker APK Build System

Docker-based system for building SimpleLink Connect Android APKs using TI Artifactory.

## Prerequisites
- Docker installed and running
- **TI proxy certificate** (`ti-proxy-ca.crt`) must exist in `docker/` folder (already in git, but gitignored)
- Artifactory access: `docker login artifactory.itg.ti.com`
  - Username: Your TI username
  - **Password: Your Artifactory API TOKEN** (NOT your TI password!)
  - Get API token: https://artifactory.itg.ti.com/ui/ → Profile → Generate API Key

## Build and Push Image (Maintainers)
```bash
./docker/build-and-push-image.sh                    # Auto-generates timestamp version (e.g., 20260201-143045)
./docker/build-and-push-image.sh 2.0.5              # Custom version
```

## Build APK (Team Members)
```bash
./docker/run-container.sh 20260201-143045           # Build APK with specific version
./docker/run-container.sh 20260201-143045 --clean-cache  # Clean build
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`

## Key Files
- `Dockerfile` - Image definition (Android SDK, Node.js, build tools)
- `build-and-push-image.sh` - Build and push image to Artifactory
- `run-container.sh` - Pull image and build APK
- `build-apk.sh` - Build script inside container
- `extract-build-versions.sh` - Sync SDK versions from build.gradle
- `ti-proxy-ca.crt` - TI proxy certificate (REQUIRED for builds)

## How to Get Your Artifactory Token
1. Go to [TI Artifactory](https://artifactory.itg.ti.com)
2. Click on "Set Me Up" (usually in the top right corner or in your profile)
3. Enter your TI password when prompted
4. Copy the generated API key/token
5. Use this token as the password when running `docker login artifactory.itg.ti.com`
