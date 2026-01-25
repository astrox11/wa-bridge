use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{FromRow, sqlite::SqlitePool};

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct Session {
    pub id: String,
    pub status: String,
    pub name: Option<String>,
    #[sqlx(rename = "profileUrl")]
    pub profile_url: Option<String>,
    #[sqlx(rename = "isBusinessAccount")]
    pub is_business_account: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow, Serialize, Clone)]
pub struct UserSettings {
    #[sqlx(rename = "sessionId")]
    pub session_id: String,
    #[sqlx(rename = "configKey")]
    pub config_key: String,
    #[sqlx(rename = "configValue")]
    pub config_value: Option<String>,
}

use sqlx::sqlite::SqliteConnectOptions;
use std::fs;
use std::path::Path;
use std::str::FromStr;

pub async fn sync_db() -> SqlitePool {
    let database_url = "sqlite://../dev.sqlite";

    let opts = SqliteConnectOptions::from_str(database_url)
        .expect("Invalid database URL")
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

    let pool = SqlitePool::connect_with(opts)
        .await
        .expect("Failed to initialize SQLite database");

    let schema_path = "../store/main.sql";

    if Path::new(schema_path).exists() {
        match fs::read_to_string(schema_path) {
            Ok(schema) => {
                if let Err(e) = sqlx::query(&schema).execute(&pool).await {
                    eprintln!("⚠️ Warning: Failed to execute schema from main.sql: {}", e);
                } else {
                }
            }
            Err(e) => eprintln!("❌ Failed to read main.sql: {}", e),
        }
    } else {
        eprintln!(
            "⚠️ Warning: store/main.sql not found at {}. Skipping table init.",
            schema_path
        );
    }

    pool
}
