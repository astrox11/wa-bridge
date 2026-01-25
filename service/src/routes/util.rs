use axum::{Json, response::IntoResponse};
use reqwest::header::USER_AGENT;
use scraper::{Html, Selector};
use serde::Serialize;
use serde_json::json;

#[derive(Serialize)]
struct Article {
    title: String,
    link: String,
    description: String,
    date: String,
}

pub async fn get_whatsapp_news() -> impl IntoResponse {
    let client = reqwest::Client::new();

    let res = match client
        .get("https://wabetainfo.com/")
        .header(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .send()
        .await
    {
        Ok(response) => response.text().await.unwrap_or_default(),
        Err(_) => return Json(json!({"status": false, "message": "Failed to fetch news"})),
    };

    let document = Html::parse_document(&res);

    let card_selector = Selector::parse(".card-content").unwrap();
    let title_selector = Selector::parse(".entry-title a").unwrap();
    let excerpt_selector = Selector::parse(".entry-excerpt").unwrap();
    let date_selector = Selector::parse(".entry-date time").unwrap();

    let mut articles = Vec::new();

    for (i, element) in document.select(&card_selector).enumerate() {
        if i >= 5 { break; }

        let title_element = element.select(&title_selector).next();
        let title = title_element.map(|e| e.text().collect::<String>()).unwrap_or_default();
        let link = title_element.and_then(|e| e.value().attr("href")).unwrap_or_default().to_string();

        let description = element.select(&excerpt_selector)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let date = element.select(&date_selector)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();

        articles.push(Article {
            title,
            link,
            description,
            date,
        });
    }

    Json(json!({
        "status": true,
        "data": articles
    }))
}
