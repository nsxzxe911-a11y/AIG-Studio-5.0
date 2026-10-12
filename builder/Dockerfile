FROM gradle:9.6.0-jdk17 AS builder
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip python3 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY builder/aig432.tgz.b64 /payload/aig432.tgz.b64
RUN base64 -d /payload/aig432.tgz.b64 > /tmp/aig432.tgz && \
    echo 'aa0b8958a2f4f04e0e9df189eb258e62799d620e7004e35dd84d286746c5b9d4  /tmp/aig432.tgz' | sha256sum -c - && \
    mkdir -p /src432 && tar -xzf /tmp/aig432.tgz -C /src432
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/36.0.0:$PATH
RUN mkdir -p /opt/android-sdk/cmdline-tools /tmp/android-sdk && \
    curl -fL --retry 4 --retry-delay 2 https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip -o /tmp/android-sdk/cmdline-tools.zip && \
    echo '4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583  /tmp/android-sdk/cmdline-tools.zip' | sha256sum -c - && \
    unzip -q /tmp/android-sdk/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools && \
    mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest && \
    yes | sdkmanager --licenses >/dev/null || true
RUN sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
WORKDIR /src432/android-official-fifth-432
RUN sed -i 's/-Xmx4g/-Xmx1g/' gradle.properties && \
    python3 ci/verify_official_android_432.py && \
    gradle :app:assembleDebug --stacktrace --no-daemon && \
    mkdir -p /out && \
    cp app/build/outputs/apk/debug/app-debug.apk /out/AIG_II_AIG_CNC_432_OFFICIAL_DEBUG.apk && \
    apksigner verify --verbose /out/AIG_II_AIG_CNC_432_OFFICIAL_DEBUG.apk > /out/apksigner.txt && \
    aapt dump badging /out/AIG_II_AIG_CNC_432_OFFICIAL_DEBUG.apk > /out/apk-badging.txt && \
    sha256sum /out/AIG_II_AIG_CNC_432_OFFICIAL_DEBUG.apk > /out/apk-sha256.txt && \
    printf '%s\n' 'AIG_VERSION=432.0.0' 'SOURCE_TGZ_SHA256=aa0b8958a2f4f04e0e9df189eb258e62799d620e7004e35dd84d286746c5b9d4' 'ANDROID_COMMAND_LINE_TOOLS=15859902' 'ANDROID_SDK=36' 'BUILD_TOOLS=36.0.0' 'GRADLE=9.6.0' 'AGP=9.4.0' 'STATIC_CONTRACT=PASS' 'APK_BUILD=PASS' 'APK_SIGNATURE_VERIFY=PASS' 'RUNTIME_DEVICE_SCREENSHOT=NOT_YET_VERIFIED' > /out/evidence.txt && \
    printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIG Fifth 432 APK</title></head><body style="background:#020407;color:#fff;font-family:sans-serif;padding:32px"><h1>AIG-II / AIG CNC 432</h1><p>Android official SDK 36 debug build.</p><p><a style="color:#00e5ff;font-size:22px" href="/AIG_II_AIG_CNC_432_OFFICIAL_DEBUG.apk">下載 APK</a></p><p><a style="color:#aaa" href="/apk-sha256.txt">SHA-256</a> · <a style="color:#aaa" href="/evidence.txt">Build evidence</a></p></body></html>' > /out/index.html

FROM python:3.12-alpine
WORKDIR /site
COPY --from=builder /out/ /site/
EXPOSE 10000
CMD ["sh","-c","python3 -m http.server ${PORT:-10000} --bind 0.0.0.0"]
