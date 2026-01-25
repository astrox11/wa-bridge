use crate::AppState;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde_json::{Value, json};
use std::sync::Arc;

pub async fn pair_instance(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    {
        let workers = state.sm.workers.read().await;
        if let Some(worker) = workers.get(&phone) {
            if worker.status == "active" || worker.status == "connected" {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(json!({"error": "instance already connected"})),
                ));
            }
        }
    }

    state.sm.start_instance(&phone, state.clone()).await;

    Ok(Json(json!({
        "status": "pairing",
        "phone": phone,
    })))
}
