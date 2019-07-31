# Docker image for this file is hosted at
# us.gcr.io/celo-testnet/celocli-light:master
#
# How to test changes to this file
# docker build -f dockerfiles/cli/Dockerfile -t gcr.io/celo-testnet/celocli-light:$USER .
#
# Run commands against it using
# docker exec -it cli_container celocli <sub-command>
# For example,
# docker exec -it cli_container celocli account:balance 0x456f41406B32c45D59E539e4BBA3D7898c3584dA
# docker exec -it cli_container celocli account:balance 0xa0Af2E71cECc248f4a7fD606F203467B500Dd53B
#
# To restart
# docker start -ai cli_container
#
# To kill
# docker kill cli_container

# Build CLI
FROM node:8-alpine as node
RUN apk update && apk add python git make gcc g++

WORKDIR /celo-monorepo/
RUN npm install @celo/celocli

RUN ln -s /celo-monorepo/node_modules/.bin/celocli /usr/local/bin/celocli
