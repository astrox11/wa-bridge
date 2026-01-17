package routes

import (
	"api/manager"
	"bufio"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"
)

func CastRoutes(app *fiber.App, sm *manager.SessionManager) {
	api := app.Group("/api")
	app.Static("/", "../interface")

	api.Get("/system/stream", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Transfer-Encoding", "chunked")

		c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
			for {
				stats := manager.GetSystemStats()
				data, _ := json.Marshal(stats)

				fmt.Fprintf(w, "data: %s\n\n", string(data))

				if err := w.Flush(); err != nil {
					return
				}

				time.Sleep(2 * time.Second)
			}
		}))

		return nil
	})

	InstanceRoutes(app, sm)
	PairRoutes(app, sm)
	UtilRoutes(app)
	SettingsRoutes(app, sm)
}
