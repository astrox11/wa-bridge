package routes

import (
	"api/manager"

	"github.com/gofiber/fiber/v2"
)

func PairRoutes(app *fiber.App, sm *manager.SessionManager) {
	api := app.Group("/api")

	api.Post("/instances/:phone/pair", func(c *fiber.Ctx) error {
		phone := c.Params("phone")

		worker, ok := sm.GetWorker(phone)
		if ok {
			status := worker.GetStatus()

			if status == "active" || status == "connected" {
				return c.Status(400).JSON(fiber.Map{"error": "instance already connected"})
			}
		}

		if err := sm.StartInstance(phone, "pairing"); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to initialize pairing"})
		}

		return c.JSON(fiber.Map{
			"status": "pairing",
			"phone":  phone,
		})
	})
}
