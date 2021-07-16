package main

import (
	"github.com/gorilla/websocket"
	uuid "github.com/satori/go.uuid"
)

type Client struct {
	id       string
	hub      *Hub
	color    string
	socket   *websocket.Conn
	outbound chan []byte
}

// Client Constructor
func newClient(hub *Hub, socket *websocket.Conn) *Client {
	return &Client{
		id:       uuid.NewV4().String(),
		color:    generateColor(),
		hub:      hub,
		socket:   socket,
		outbound: make(chan []byte),
	}
}
