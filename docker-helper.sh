#!/bin/bash

# TNL Docker Helper - Convenience script in root directory
# Forwards commands to the docker/tnl-docker.sh script

cd "$(dirname "$0")/docker" && ./tnl-docker.sh "$@"