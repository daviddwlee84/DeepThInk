#! /bin/bash
docker network create elastic

# Run elasticsearch
docker run --name es01 --net elastic -d -p 127.0.0.1:9200:9200 -p 127.0.0.1:9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:7.16.0
# Run kibana
docker run --name kib01 --net elastic -d -p 127.0.0.1:5601:5601 -e "ELASTICSEARCH_HOSTS=http://es01:9200" docker.elastic.co/kibana/kibana:7.16.0
docker ps
