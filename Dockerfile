# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# One ArtCraft app for Unraid on LinuxServer.io's baseimage-selkies, streamed to
# the browser. Every app builds from this file; APP picks which one, and
# apps.json holds the list and the pinned upstream versions.
#
# The apps are winit and wgpu programs that speak Wayland natively, so the base
# runs in its Wayland mode (labwc) instead of Xvfb with openbox. They render on
# the GPU when one is passed in and fall back to Mesa's software drivers
# otherwise.

ARG BASE_TAG=ubunturesolute@sha256:e73f4ce644db0e9ba8deb33f03b559c880e3e3eec78046252a178c2ee3c2b6f6
FROM ghcr.io/linuxserver/baseimage-selkies:${BASE_TAG}

ARG APP
ARG APP_TITLE
ARG APP_VERSION
ARG TARGETARCH

LABEL maintainer="junkerderprovinz"
LABEL org.opencontainers.image.title="${APP}"
LABEL org.opencontainers.image.description="${APP_TITLE} for Unraid with a Selkies web desktop, in your browser without a VNC client"
LABEL org.opencontainers.image.source="https://github.com/junkerderprovinz/artcraft-apps"
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
LABEL org.opencontainers.image.vendor="junkerderprovinz"

# TITLE feeds the PWA manifest; SELKIES_UI_TITLE is the visible tab/sidebar
# title of the Selkies web client. Selkies will not start with basic auth on and
# no password, so SELKIES_ENABLE_BASIC_AUTH=false keeps the no-login default;
# the base's nginx still enforces HTTP basic auth once a real
# CUSTOM_USER/PASSWORD is set.
#
# RESTART_APP=true turns on the base image's svc-watchdog, which runs the labwc
# autostart again when the app disappears; otherwise closing the app leaves an
# empty desktop until the container restarts. The watchdog matches the
# autostart command line, which is why rootfs/defaults/autostart does not
# `exec` the launch.
#
# The apps draw their own title bar, so NO_DECOR drops the one labwc would
# add on top of it.
ENV TITLE="${APP_TITLE}" \
    SELKIES_UI_TITLE="${APP_TITLE}" \
    SELKIES_ENABLE_BASIC_AUTH="false" \
    PIXELFLUX_WAYLAND="true" \
    NO_DECOR="true" \
    RESTART_APP="true" \
    CRAFT_APP="${APP}" \
    CRAFT_TITLE="${APP_TITLE}"

# The release's SHA256SUMS.txt is checked before the package is installed. The
# packages declare their libraries; on top of that come Mesa's Vulkan and EGL
# drivers for the software fallback, the GTK desktop portal for the file
# dialogs, the ALSA to PulseAudio bridge so sound reaches the browser, and the
# metric-compatible office fonts, since Word, Excel and PowerPoint files ask
# for Calibri, Cambria and Arial by name.
WORKDIR /tmp
RUN set -eux; \
    case "${TARGETARCH}" in \
        amd64) arch=x86_64 ;; \
        arm64) arch=aarch64 ;; \
        *) echo "unsupported architecture ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    deb="${APP}-${APP_VERSION}-linux-${arch}.deb"; \
    url="https://github.com/storytold/${APP}/releases/download/v${APP_VERSION}"; \
    curl -fsSL --retry 3 -o "${deb}" "${url}/${deb}"; \
    curl -fsSL --retry 3 -o SHA256SUMS.txt "${url}/SHA256SUMS.txt"; \
    grep " ${deb}\$" SHA256SUMS.txt > deb.sha256; \
    sha256sum -c deb.sha256; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        "/tmp/${deb}" \
        mesa-vulkan-drivers libegl-mesa0 libgl1-mesa-dri \
        xdg-desktop-portal xdg-desktop-portal-gtk \
        libasound2-plugins \
        fontconfig \
        fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji \
        fonts-dejavu-core fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea; \
    test -x "/usr/bin/${APP}"; \
    fc-cache -f >/dev/null 2>&1 || true; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/* /tmp/*
WORKDIR /

COPY rootfs/ /

# CR is stripped so a Windows checkout cannot break the banner. The base's own
# adduser branding is blanked so the log shows only the print-banner.sh block.
COPY .github/assets/banner-raw.txt /usr/local/share/banner-raw.txt
RUN tr -d '\r' < /usr/local/share/banner-raw.txt > /usr/local/share/banner.txt; \
    rm -f /usr/local/share/banner-raw.txt; \
    : > /etc/s6-overlay/s6-rc.d/init-adduser/branding 2>/dev/null || true

# Tab and sidebar icon of the Selkies web client.
COPY .github/assets/icons/${APP}.png /usr/share/selkies/www/icon.png

RUN chmod +x /usr/local/bin/print-banner.sh \
             /etc/s6-overlay/s6-rc.d/init-craft/run \
             /etc/s6-overlay/s6-rc.d/svc-craft-ready/run \
             /defaults/autostart

EXPOSE 3001
VOLUME /config
