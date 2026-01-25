use crate::{AppState, sql::UserSettings};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Arc;

#[derive(Deserialize)]
pub struct UpdateSettingReq {
    pub key: String,
    pub value: Value,
}

pub async fn get_settings(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, StatusCode> {
    let settings: Vec<UserSettings> = sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM session_configurations WHERE sessionId = ?",
    )
    .bind(&phone)
    .fetch_all(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Settings fetch error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(json!({
        "status": "success",
        "phone": phone,
        "settings": settings
    })))
}

pub async fn update_setting(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateSettingReq>,
) -> Result<Json<Value>, StatusCode> {
    // Convert Value to String properly:
    // .as_str() handles quotes for literal strings,
    // otherwise .to_string() falls back for complex types.
    let val_str = match &req.value {
        Value::String(s) => s.clone(),
        other => other.to_string(),
    };

    sqlx::query(
        "INSERT INTO session_configurations (sessionId, configKey, configValue) 
         VALUES (?, ?, ?) 
         ON CONFLICT(sessionId, configKey) DO UPDATE SET configValue = excluded.configValue",
    )
    .bind(&phone)
    .bind(&req.key)
    .bind(&val_str)
    .execute(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Settings update error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(json!({
        "status": "success",
        "message": format!("Updated {} for {}", req.key, phone)
    })))
}
