package main

import (
	"net/http"
	"log"
	"fmt"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024,
	WriteBufferSize: 1024,
}

func homePage(w http.ResponseWriter, r *http.Request) {
	log.Println("hello")
	fmt.Fprintf(w, "Home Page")
}

func reader(conn *websocket.Conn) {
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		log.Println(string(p))

		if err := conn.WriteMessage(messageType, p); err != nil {
			log.Println(err)
			return
		}
	}
}

func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	// allow any request, ignore cors
	upgrader.CheckOrigin = func(r *http.Request) bool {
        return true
    }

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
	}
	
	log.Println("Client successfully connected")
	reader(ws)
}


func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Get("/", homePage)
	r.Get("/ws", wsEndpoint)
	http.ListenAndServe(":8080", r)
}