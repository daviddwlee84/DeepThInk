#!/bin/bash
# Build and push to Docker Hub
docker build -t leungjch/hai-art-server:latest . && docker push leungjch/hai-art-server:latest