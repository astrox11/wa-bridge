package routes

import (
	"net/http"

	"github.com/PuerkitoBio/goquery"
	"github.com/gofiber/fiber/v2"
)

func UtilRoutes(app *fiber.App) {
	api := app.Group("/util")

	api.Get("/whatsapp-news", func(c *fiber.Ctx) error {
		res, err := http.Get("https://wabetainfo.com/")
		if err != nil {
			return c.Status(500).SendString("Failed to fetch news")
		}
		defer res.Body.Close()

		doc, err := goquery.NewDocumentFromReader(res.Body)
		if err != nil {
			return c.Status(500).SendString("Failed to parse news")
		}

		var articles []fiber.Map

		doc.Find(".card-content").Each(func(i int, s *goquery.Selection) {
			if i >= 5 {
				return
			}

			title := s.Find(".entry-title a").Text()
			link, _ := s.Find(".entry-title a").Attr("href")
			description := s.Find(".entry-excerpt").Text()
			date := s.Find(".entry-date time").Text()

			articles = append(articles, fiber.Map{
				"title":       title,
				"link":        link,
				"description": description,
				"date":        date,
			})
		})

		return c.JSON(fiber.Map{
			"status": true,
			"data":   articles,
		})
	})
}
