package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/tidwall/gjson"
	"main.com/m/v2/message"
)

type Hub struct {
	clients    []*Client
	register   chan *Client
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		clients:    make([]*Client, 0),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (hub *Hub) run() {
	for {
		select {
		case client := <-hub.register:
			hub.onConnect(client)
		case client := <-hub.unregister:
			hub.onDisconnect(client)
		}
	}
}

var upgrader = websocket.Upgrader{
	// Allow all origins
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Called when new client connects to ws endpoint
func (hub *Hub) handleWebsocket(w http.ResponseWriter, r *http.Request) {
	socket, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		http.Error(w, "could not upgrade", http.StatusInternalServerError)
		return
	}
	client := newClient(hub, socket)
	hub.clients = append(hub.clients, client)
	hub.register <- client
	client.run()
}

// Send a message to a client
func (hub *Hub) send(message interface{}, client *Client) {
	data, _ := json.Marshal(message)
	client.outbound <- data
}

// Broadcast a message to all clients except one
func (hub *Hub) broadcast(message interface{}, ignore *Client) {
	data, _ := json.Marshal(message)
	for _, c := range hub.clients {
		if c != ignore {
			c.outbound <- data
		}
	}
}

// Broadcast a message to all clients
func (hub *Hub) broadcastAll(message interface{}) {
	data, _ := json.Marshal(message)
	for _, c := range hub.clients {
		c.outbound <- data
	}
}

func (hub *Hub) onConnect(client *Client) {
	log.Println("client connected: ", client.socket.RemoteAddr())
	// Make a list of all users
	users := []message.User{}
	for _, c := range hub.clients {
		users = append(users, message.User{ID: c.id})
	}
	// Notify the new user
	hub.send(message.NewConnected(users), client)
	// Broadcast new user joined to other users
	hub.broadcast(message.NewUserJoined(client.id), client)
}

func (hub *Hub) onDisconnect(client *Client) {
	log.Println("client disconnected: ", client.socket.RemoteAddr())
	client.close()
	// Find index of client
	i := -1
	for j, c := range hub.clients {
		if c.id == client.id {
			i = j
			break
		}
	}
	// Delete client from list
	copy(hub.clients[i:], hub.clients[i+1:])
	hub.clients[len(hub.clients)-1] = nil
	hub.clients = hub.clients[:len(hub.clients)-1]
	// Notify user left
	hub.broadcast(message.NewUserLeft(client.id), nil)
}

func (hub *Hub) onMessage(data []byte, client *Client) {
	kind := gjson.GetBytes(data, "kind").Int()
	switch kind {
	case message.KindStrokeStart:
		log.Println("Send start message")
		var msg message.StrokeStart = message.StrokeStart{
			Kind:   message.KindStrokeStart,
			UserID: client.id,
		}
		hub.broadcast(msg, client)

		// Create a new element in Strokes
	case message.KindStrokeEnd:
		log.Println("Send start message")
		data := gjson.GetBytes(data, "data")
		log.Println("Got end", string(data.String()))

		var msg message.StrokeEnd = message.StrokeEnd{
			Kind:      message.KindStrokeEnd,
			UserID:    client.id,
			Thickness: data.Get("thickness").Float(),
			Color:     data.Get("color").String(),
		}
		hub.broadcast(msg, client)

	case message.KindStroke:
		data := gjson.GetBytes(data, "data")
		var msg message.StrokePoint
		log.Println("Got stroke", string(data.String()))

		msg.UserID = client.id
		msg = message.StrokePoint{
			Kind:   message.KindStroke,
			UserID: client.id,
			Point: message.Point{
				X: data.Get("point.x").Float(),
				Y: data.Get("point.y").Float(),
			},
			Thickness: data.Get("thickness").Float(),
			Color:     data.Get("color").String(),
		}
		fmt.Printf("%#v\n", msg)
		hub.broadcast(msg, client)
	case message.KindClear:
		var msg message.Clear
		if json.Unmarshal(data, &msg) != nil {
			return
		}
		msg.UserID = client.id
		hub.broadcast(msg, client)
	case message.KindClientInfo:
		// Update the client info
		canvasData := gjson.GetBytes(data, "data")
		var canvasConfig ClientCanvas = ClientCanvas{
			canvasWidth:  float32(canvasData.Get("canvasWidth").Float()),
			canvasHeight: float32(canvasData.Get("canvasHeight").Float()),
		}
		client.canvasInfo = canvasConfig
		log.Println("Got canvas ")
		fmt.Printf("%#v\n", client)

	// Generate the image and send it back to all clients
	case message.KindGenerate:
		generate_url := fmt.Sprintf("%s/generate", MODEL_URL)

		// Fetch imagedata from payload
		data := gjson.GetBytes(data, "data")

		imageData := data.Get("imageData").String()

		// Make request to model server
		postBody, _ := json.Marshal(map[string]string{
			"imageData": imageData,
		})

		responseBody := bytes.NewBuffer(postBody)
		resp, err := http.Post(generate_url, "application/json", responseBody)
		if err != nil {
			log.Fatal(err)
		}
		body, err := ioutil.ReadAll(resp.Body)

		generatedImageData := gjson.GetBytes(body, "data").String()

		var msg message.Generate = message.Generate{
			Kind:      message.KindGenerate,
			ImageData: generatedImageData,
		}

		hub.broadcastAll(msg)
	}

}
