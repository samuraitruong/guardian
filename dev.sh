#!/bin/bash
set -ex
function build_in_folder() {
    echo "Install dependencies in %s" % $1
    npm install --prefix $1
}

build_in_folder interfaces
build_in_folder common
build_in_folder logger-helper
build_in_folder logger-service
build_in_folder frontend
build_in_folder auth-service
build_in_folder guardian-service
build_in_folder message-broker
build_in_folder api-gateway
build_in_folder mrv-sender
build_in_folder ipfs-client
build_in_folder topic-viewer

# watching changes and compile , if we not using module_alias, we not really need this step
npm run dev --prefix interfaces & \
npm run dev --prefix common & \
npm run dev --prefix logger-helper & \
npm run dev --prefix logger-service & \
npm run dev --prefix auth-service & \
npm run dev --prefix ipfs-client & \
npm run dev --prefix guardian-service & \
npm run dev --prefix api-gateway & \
wait