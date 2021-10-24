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
docker run -p 8080:8080 leungjch/hai-art-server:latest
```
To push the Docker image to Docker Hub, run
```
docker push leungjch/hai-art-server:latest
```
