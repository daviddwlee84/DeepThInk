package main

import (
	"github.com/gorilla/websocket"
	uuid "github.com/satori/go.uuid"
	"main.com/m/v2/message"
)

type Client struct {
	id         string
	hub        *Hub
	socket     *websocket.Conn
	outbound   chan []byte
	canvasInfo ClientCanvas
	strokes    []message.Stroke
}

type ClientCanvas struct {
	canvasWidth  float32 `json:"canvasWidth"`
	canvasHeight float32 `json:"canvasHeight"`
}

// Constructor for client
func newClient(hub *Hub, socket *websocket.Conn) *Client {
	return &Client{
		id:         uuid.NewV4().String(),
		hub:        hub,
		socket:     socket,
		outbound:   make(chan []byte),
		canvasInfo: ClientCanvas{canvasWidth: 0, canvasHeight: 0},
		strokes:    make([]message.Stroke, 0),
	}
}

func (client *Client) write() {
	for {
		select {
		case data, ok := <-client.outbound:
			if !ok {
				client.socket.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			client.socket.WriteMessage(websocket.TextMessage, data)
		}
	}
}

func (client *Client) read() {
	defer func() {
		client.hub.unregister <- client
	}()
	for {
		_, data, err := client.socket.ReadMessage()
		if err != nil {
			break
		}
		client.hub.onMessage(data, client)
	}
}

func (client Client) run() {
	go client.read()
	go client.write()
}

func (client Client) close() {
	client.socket.Close()
	close(client.outbound)
}
