# Docker image for building React Native/Expo Android APKs
# SimpleLink Connect APK Builder

# Using Microsoft Container Registry (accessible through TI proxy)
FROM mcr.microsoft.com/openjdk/jdk:17-ubuntu

# Build arguments for proxy configuration
ARG HTTP_PROXY=http://webproxy.ext.ti.com:80
ARG HTTPS_PROXY=http://webproxy.ext.ti.com:80
ARG NO_PROXY=localhost,127.0.0.1

# Set environment variables for proxy
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    http_proxy=${HTTP_PROXY} \
    https_proxy=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY} \
    no_proxy=${NO_PROXY}

# Android SDK environment variables
ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools"

# Install required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    wget \
    zip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add TI proxy certificate
COPY docker/ti-proxy-ca.crt /usr/local/share/ca-certificates/ti-proxy-ca.crt
RUN update-ca-certificates

# Install Android SDK command-line tools
RUN mkdir -p ${ANDROID_HOME}/cmdline-tools && \
    cd ${ANDROID_HOME}/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip && \
    unzip -q cmdline-tools.zip && \
    rm cmdline-tools.zip && \
    mv cmdline-tools latest

# Accept licenses and install Android SDK components
# Installing both SDK 35 and 36 for compatibility with all packages
RUN yes | sdkmanager --licenses && \
    sdkmanager --update && \
    sdkmanager \
        "platforms;android-35" \
        "platforms;android-36" \
        "build-tools;35.0.0" \
        "build-tools;36.0.0" \
        "ndk;29.0.14206865" \
        "platform-tools"

# Install Node.js 20.x LTS using NodeSource
RUN apt-get update && \
    apt-get install -y ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Configure npm proxy
RUN npm config set proxy ${HTTP_PROXY} && \
    npm config set https-proxy ${HTTPS_PROXY}

# Set working directory
WORKDIR /app

# Create gradle cache directory
RUN mkdir -p /root/.gradle

# Default command
CMD ["/bin/bash", "/app/docker/build-apk.sh"]
