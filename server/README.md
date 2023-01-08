# Running locally
To run the server locally, run 
```shell
go build -o server && ./server
```
# Docker
To build the Docker image, run 
```shell
docker build -t leungjch/hai-art-server:latest .
```
To run the Docker image, run
```shell
docker run --net elastic -p 8080:8080 -e ELASTICSEARCH_URL="http://es01:9200" leungjch/hai-art-server:latest
```

To push the Docker image to Docker Hub, run
```
docker push leungjch/hai-art-server:latest
```

# (Optional) Elasticsearch

This is an old feature that is now disabled by default. The server can optionally run Elasticsearch for logging data.

## Install elasticsearch
```shell
docker network create elastic

docker pull docker.elastic.co/elasticsearch/elasticsearch:7.16.0
```

## Install kibana
```shell
docker pull docker.elastic.co/kibana/kibana:7.16.0
```

## Start elasticsearch and kibana
```shell
./run-elastic.sh
```

