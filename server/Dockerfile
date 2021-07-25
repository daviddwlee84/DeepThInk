FROM golang:1.16.6-alpine3.14

## create working app directory
RUN mkdir /app

ADD . /app

WORKDIR /app

EXPOSE 8080

RUN go build -o main .

CMD ["/app/main"]
