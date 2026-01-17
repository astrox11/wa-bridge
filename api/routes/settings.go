package routes

import (
	"api/manager"
	database "api/sql"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

func SettingsRoutes(app *fiber.App, sm *manager.SessionManager) {
	api := app.Group("/api")

	api.Get("/settings/:phone", func(c *fiber.Ctx) error {
		phone := c.Params("phone")

		settings, err := database.GetAllSettingsForSession(phone)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to retrieve user settings",
			})
		}

		return c.JSON(fiber.Map{
			"status":   "success",
			"phone":    phone,
			"settings": settings,
		})
	})

	api.Patch("/settings/:phone", func(c *fiber.Ctx) error {
		phone := c.Params("phone")

		type UpdateReq struct {
			Key   string `json:"key"`
			Value any    `json:"value"`
		}

		var req UpdateReq
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		allowedKeys := map[string]bool{
			"language": true, "prefix": true, "mode": true, "afk": true,
			"bgm": true, "alive_msg": true, "filters": true, "antimsg": true,
			"antiword": true, "antilink": true, "anticall": true, "antidelete": true,
			"antilink_spam": true, "welcome_msg": true, "goodbye_msg": true,
			"group_events": true, "autokick": true,
		}

		if !allowedKeys[req.Key] {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid setting key"})
		}

		// Convert 'any' to 'string' using fmt.Sprintf to satisfy the function signature
		valStr := fmt.Sprintf("%v", req.Value)

		if err := database.UpdateUserSetting(phone, req.Key, valStr); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update setting"})
		}

		return c.JSON(fiber.Map{
			"status":  "success",
			"message": fmt.Sprintf("Updated %s for %s", req.Key, phone),
		})
	})

}
