#!/bin/bash

environment="$1"

yarn --cwd ../sdk build-sdk $environment

rm -rf ./src/generated
mkdir -p ./src/generated/contracts
mkdir -p ./src/generated/types
cp ../sdk/contracts/*.ts ./src/generated/contracts
cp ../sdk/types/*.d.ts ./src/generated/types
