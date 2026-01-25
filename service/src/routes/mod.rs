pub mod instance;
pub mod pair;
pub mod settings;
pub mod system;
pub mod util;

use crate::AppState;
use axum::{
    Router,
    routing::{get, patch, post},
};
use std::sync::Arc;

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/instances", get(instance::list_instances))
        .route("/api/instances/stream", get(instance::instance_stream))
        .route("/api/instances/:phone", get(instance::get_instance))
        .route(
            "/api/instances/:phone/start",
            post(instance::start_instance),
        )
        .route(
            "/api/instances/:phone/pause",
            post(instance::pause_instance),
        )
        .route(
            "/api/instances/:phone/resume",
            post(instance::resume_instance),
        )
        .route(
            "/api/instances/:phone/reset",
            post(instance::reset_instance),
        )
        .route("/api/instances/:phone/pair", post(pair::pair_instance))
        .route("/api/settings/:phone", get(settings::get_settings))
        .route("/api/settings/:phone", patch(settings::update_setting))
        .route(
            "/api/system/stream",
            get(crate::routes::system::system_stream),
        )
        .route("/util/whatsapp-news", get(util::get_whatsapp_news))
}
