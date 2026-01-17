package routes

import (
	"api/manager"
	database "api/sql"

	"github.com/gofiber/fiber/v2"
)

func InstanceRoutes(app *fiber.App, sm *manager.SessionManager) {
	api := app.Group("/api")

	api.Get("/instances", func(c *fiber.Ctx) error {
		sessions, err := database.GetAllSessions(database.DB)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to retrieve sessions"})
		}
		return c.JSON(sessions)
	})

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
		if err := sm.PauseInstance(phone, true); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "paused"})
	})

	api.Post("/instances/:phone/resume", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.PauseInstance(phone, false); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "resuming"})
	})

	api.Post("/instances/:phone/reset", func(c *fiber.Ctx) error {
		phone := c.Params("phone")
		if err := sm.ClearSession(phone); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to clear Redis"})
		}
		return c.JSON(fiber.Map{"message": "Redis cleared. You can now request a new pairing code."})
	})

	api.Post("/instances/:phone/contacts", func(c *fiber.Ctx) error {
		contact, err := database.GetContacts(c.Params("phone"))
		if err == nil {
			return c.JSON(contact)
		}
		return c.JSON(fiber.Map{"error": "Unable to get instance contacts"})
	})

	api.Post("instances/:phone/groups", func(c *fiber.Ctx) error {
		groups, err := database.GetAllGroupsMap(c.Params("phone"))
		if err == nil {
			return c.JSON(groups)
		}
		return c.JSON(fiber.Map{"error": "Unable to get instance groups"})
	})
}
