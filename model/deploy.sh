#!/bin/bash
# Build and push to Docker Hub
docker build -t leungjch/hai-art-model:latest . && docker push leungjch/hai-art-model:latest