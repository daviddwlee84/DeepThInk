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
	// es         *elasticsearch.Client
	es int
}

func newHub() *Hub {
	// esClient, err := elasticsearch.NewDefaultClient()
	// if err != nil {
	// 	log.Fatalf("Error creating the client: %s", err)
	// }
	// log.Println(elasticsearch.Version)

	// res, err := esClient.Info()
	// if err != nil {
	// 	log.Fatalf("Error getting response: %s", err)
	// }
	// defer res.Body.Close()
	// log.Println(res)
	esClient := -1 // disable ES

	return &Hub{
		clients:    make([]*Client, 0),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		es:         esClient,
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

func (hub *Hub) sendES(clientId string, msgStr []byte) {
	// request := esapi.IndexRequest{
	// 	Index:      clientId,
	// 	DocumentID: fmt.Sprint(time.Now().UnixNano()),
	// 	Body:       strings.NewReader(string(msgStr)),
	// }
	// request.Do(context.Background(), hub.es)

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
func (hub *Hub) broadcast(message interface{}, ignoreId string) {
	data, _ := json.Marshal(message)
	for _, c := range hub.clients {
		if c.id != ignoreId {
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
	hub.broadcast(message.NewUserJoined(client.id), client.id)

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
	hub.broadcast(message.NewUserLeft(client.id), "")
}

func (hub *Hub) onMessage(data []byte, client *Client) {
	kind := gjson.GetBytes(data, "kind").Int()

	switch kind {
	case message.KindStrokeStart:
		data := gjson.GetBytes(data, "data")

		log.Println("Send start message")
		var msg message.StrokeStart = message.StrokeStart{
			Kind:   message.KindStrokeStart,
			UserID: client.id,
			Point: message.Point{
				X: data.Get("point.x").Float(),
				Y: data.Get("point.y").Float(),
			},
			Thickness: data.Get("thickness").Float(),
			Color:     data.Get("color").String(),
		}
		hub.broadcast(msg, client.id)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)

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
		hub.broadcast(msg, client.id)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)

	case message.KindStroke:
		data := gjson.GetBytes(data, "data")
		var msg message.StrokePoint
		// log.Println("Got stroke", string(data.String()))

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
		// fmt.Printf("%#v\n", msg)

		hub.broadcast(msg, client.id)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)

	case message.KindClear:
		var msg message.Clear
		if json.Unmarshal(data, &msg) != nil {
			return
		}
		msg.UserID = client.id
		hub.broadcast(msg, client.id)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)

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

		hub.send(msg, client)
		// Collab mode (disabled)
		hub.broadcast(msg, client.id)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)

	// Generate a stylized image and send it to all clients
	case message.KindStylize:
		generate_url := fmt.Sprintf("%s/stylize", MODEL_URL)
		log.Println("Got stylize")

		// Fetch imagedata and style from payload
		data := gjson.GetBytes(data, "data")
		imageData := data.Get("imageData").String()
		style := data.Get("style").String()

		// Make request to model server
		postBody, _ := json.Marshal(map[string]string{
			"imageData": imageData,
			"style":     style,
		})

		responseBody := bytes.NewBuffer(postBody)
		resp, err := http.Post(generate_url, "application/json", responseBody)
		if err != nil {
			log.Fatal(err)
		}
		body, err := ioutil.ReadAll(resp.Body)
		fmt.Println("body is", string(body))

		stylizedImageData := gjson.GetBytes(body, "data").String()

		var msg message.Stylize = message.Stylize{
			Kind:      message.KindStylize,
			ImageData: stylizedImageData,
			Style:     style,
		}

		hub.send(msg, client)
		// Collab mode (disabled)
		hub.broadcast(msg, client.id)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)

	case message.KindSave:
		generate_url := fmt.Sprintf("%s/save", MODEL_URL)

		log.Println("Got save painting")

		// Fetch imagedata and style from payload
		data := gjson.GetBytes(data, "data")
		displayedImageData := data.Get("displayedImageData").String()
		userCanvasImageData := data.Get("userCanvasImageData").String()
		aiCanvasImageData := data.Get("aiCanvasImageData").String()

		// Make request to model server
		postBody, _ := json.Marshal(map[string]string{
			"displayedImageData":  displayedImageData,
			"userCanvasImageData": userCanvasImageData,
			"aiCanvasImageData":   aiCanvasImageData,
			"userId":              client.id,
		})

		responseBody := bytes.NewBuffer(postBody)
		resp, err := http.Post(generate_url, "application/json", responseBody)
		if err != nil {
			log.Fatal(err)
		}
		body, err := ioutil.ReadAll(resp.Body)
		fmt.Println("body is", string(body))

		savedImageData := gjson.GetBytes(body, "data").String()

		var msg message.Save = message.Save{
			Kind:           message.KindSave,
			SavedImageData: savedImageData,
		}

		hub.send(msg, client)

		// Elasticsearch logging
		msgStr, _ := json.Marshal(msg)
		hub.sendES(client.id, msgStr)
	// When a user switches main brush ,all collaborators go to the same main brush
	case message.KindSwitchBrush:
		var msg message.SwitchBrush
		if json.Unmarshal(data, &msg) != nil {
			return
		}
		hub.broadcast(msg, client.id)
		log.Println("Got switch " + msg.Type)

	// when user applies a new filter, all collaborators get the same filter
	case message.KindSwitchFilter:
		var msg message.SwitchFilter
		if json.Unmarshal(data, &msg) != nil {
			return
		}
		hub.broadcast(msg, client.id)
		log.Println("Got filter " + msg.Type)

	}

}
