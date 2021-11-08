package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// Model server deployment URL
// var MODEL_URL string = "http://localhost:8000"
var MODEL_URL string = "http://104.154.79.84:8000"

func main() {
	fmt.Println("Starting hai-art server...")
	hub := newHub()
	go hub.run()
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("welcome"))
	})
	r.HandleFunc("/ws", hub.handleWebsocket)
	err := http.ListenAndServe(":8080", r)
	if err != nil {
		log.Fatal(err)
	}
}
