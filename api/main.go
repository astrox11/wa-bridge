package main

import (
	"api/manager"
	"api/routes"
	"github.com/gofiber/fiber/v2"
	"log"
)

func main() {
	sm := manager.NewSessionManager()
	sm.LoadFromDisk()

	app := fiber.New()
	routes.RegisterRoutes(app, sm)
	log.Fatal(app.Listen(":8080"))
}
