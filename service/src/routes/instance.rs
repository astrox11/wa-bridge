use crate::{AppState, sql::Session};
use axum::http::StatusCode;
use axum::{
    Json,
    extract::{Path, State},
    response::sse::{Event, Sse},
};
use futures::stream::{self, Stream};
use serde_json::{Value, json};
use std::{convert::Infallible, sync::Arc, time::Duration};
use tokio_stream::StreamExt as _;

pub async fn list_instances(State(state): State<Arc<AppState>>) -> Json<Vec<Session>> {
    let s: Vec<Session> =
        sqlx::query_as::<_, Session>("SELECT * FROM sessions ORDER BY createdAt DESC")
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();
    Json(s)
}

pub async fn get_instance(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    let workers = state.sm.workers.read().await;
    if let Some(w) = workers.get(&phone) {
        return Json(serde_json::json!(w));
    }
    drop(workers);

    let session = sqlx::query_as::<_, Session>("SELECT * FROM sessions WHERE id = ?")
        .bind(&phone)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    match session {
        Some(s) => Json(serde_json::json!({
            "phone": s.id,
            "status": s.status,
            "is_running": false,
            "pairing_code": null
        })),
        None => Json(serde_json::json!({"error": "not found"})),
    }
}

pub async fn start_instance(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<serde_json::Value> {
    state.sm.start_instance(&phone, state.clone()).await;

    Json(serde_json::json!({
        "status": "starting",
        "phone": phone
    }))
}

pub async fn instance_stream(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = stream::repeat_with(move || {
        let db = state.db.clone();
        async move {
            let sessions: Result<Vec<Session>, sqlx::Error> =
                sqlx::query_as::<_, Session>("SELECT * FROM sessions ORDER BY createdAt DESC")
                    .fetch_all(&db)
                    .await;

            match sessions {
                Ok(s) => {
                    let event = Event::default()
                        .json_data(s)
                        .unwrap_or_else(|_| Event::default().data("error: failed to serialize"));
                    Ok(event)
                }
                Err(e) => Ok(Event::default().data(format!("db_error: {}", e))),
            }
        }
    });

    let stream = futures::StreamExt::then(stream, |fut| fut).throttle(Duration::from_secs(2));

    Sse::new(stream)
}

pub async fn pause_instance(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<Value> {
    state.sm.pause_instance(&phone, true).await;
    Json(json!({"status": "paused", "phone": phone}))
}

pub async fn resume_instance(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<Value> {
    let is_running = {
        let workers = state.sm.workers.read().await;
        workers.get(&phone).map(|w| w.is_running).unwrap_or(false)
    };

    if !is_running {
        state.sm.start_instance(&phone, state.clone()).await;
        Json(json!({"status": "starting", "phone": phone}))
    } else {
        state.sm.pause_instance(&phone, false).await;
        Json(json!({"status": "resuming", "phone": phone}))
    }
}
pub async fn reset_instance(
    Path(phone): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, StatusCode> {
    state
        .sm
        .clear_session(&phone, &state.db, &state.redis)
        .await
        .map_err(|e| {
            eprintln!("Reset error for {}: {}", phone, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(json!({
        "status": "success",
        "message": format!("Instance {} fully wiped", phone)
    })))
}
