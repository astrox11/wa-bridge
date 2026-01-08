package routes

import (
	"api/manager"
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(app *fiber.App, sm *manager.SessionManager) {
	api := app.Group("/api")

	api.Post("/instances/:phone/start", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.StartInstance(phone, "starting"); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "starting", "phone": phone})
	})

	api.Get("/instances/:phone", func(c *fiber.Ctx) error {
		phone := c.Params("phone")

		worker, ok := sm.GetWorker(phone)
		if !ok {
			return c.Status(404).JSON(fiber.Map{"error": "instance not found"})
		}
		return c.JSON(worker.GetData())
	})

	api.Post("/instances/:phone/pause", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.TogglePause(phone, true); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "paused"})
	})

	api.Post("/instances/:phone/resume", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.TogglePause(phone, false); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "resuming"})
	})
}
