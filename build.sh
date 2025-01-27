#!/bin/bash
set -euo pipefail

# install latest hugo
HUGO_VERSION="0.140.2"
DOWNLOAD_URL="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz"
wget -P /tmp "${DOWNLOAD_URL}"
tar -xzvf /tmp/hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz -C /tmp
mv /tmp/hugo $XDG_CACHE_HOME/hugo

$XDG_CACHE_HOME/hugo --environment production --minify