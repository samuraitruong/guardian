#!/bin/bash
set -ex
function build_in_folder() {
    echo "Install dependencies in %s" % $1
    cd $1
    # npm install 
    # npm run build
    cd ..
}

build_in_folder interfaces
build_in_folder vc-modules
build_in_folder common
build_in_folder logger-service
build_in_folder frontend
build_in_folder auth-service
build_in_folder guardian-service
build_in_folder message-broker
build_in_folder api-gateway
build_in_folder mrv-sender

# watching changes and compile 
npm run dev --prefix common & npm run dev --prefix interfaces