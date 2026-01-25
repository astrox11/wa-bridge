mod manager;
mod routes;
mod sql;

use crate::sql::Session;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub redis: redis::Client,
    pub sm: manager::SessionManager,
}

#[tokio::main]
async fn main() {
    let pool = sql::sync_db().await;
    let redis_client = redis::Client::open("redis://127.0.0.1/").unwrap();
    let (tx, _rx) = tokio::sync::broadcast::channel::<String>(1024);

    let manager = manager::SessionManager {
        workers: Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::new())),
        tx: tx.clone(),
    };

    let state = Arc::new(AppState {
        db: pool.clone(),
        redis: redis_client,
        sm: manager,
    });

    let sessions: Vec<Session> = sqlx::query_as::<_, Session>("SELECT * FROM sessions")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    for session in sessions {
        if session.status == "paused" {
            let mut workers = state.sm.workers.write().await;
            workers.insert(
                session.id.clone(),
                manager::WorkerInfo {
                    phone: session.id.clone(),
                    status: "paused".to_string(),
                    pairing_code: None,
                    is_running: false,
                },
            );
            continue;
        }
        state.sm.start_instance(&session.id, state.clone()).await;
    }

    let static_service = ServeDir::new("../interface");
    let app = routes::create_routes()
        .layer(CorsLayer::permissive())
        .with_state(state)
        .fallback_service(static_service);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("Whatsaly listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
