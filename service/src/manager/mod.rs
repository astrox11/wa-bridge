pub mod events;
pub mod supervisor;

use crate::AppState;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};

#[derive(Debug, Clone, serde::Serialize)]
pub struct WorkerInfo {
    pub phone: String,
    pub status: String,
    pub pairing_code: Option<String>,
    pub is_running: bool,
}

pub struct SessionManager {
    pub workers: Arc<RwLock<HashMap<String, WorkerInfo>>>,
    pub tx: broadcast::Sender<String>,
}

impl SessionManager {
    pub async fn start_instance(&self, phone: &str, state: Arc<AppState>) {
        let phone_clone = phone.to_string();

        let _ = sqlx::query("UPDATE sessions SET status = 'starting' WHERE id = ?")
            .bind(&phone_clone)
            .execute(&state.db)
            .await;

        {
            let mut workers = self.workers.write().await;
            workers.entry(phone_clone.clone()).or_insert(WorkerInfo {
                phone: phone_clone.clone(),
                status: "starting".to_string(),
                pairing_code: None,
                is_running: true,
            });
        }
        tokio::spawn(crate::manager::supervisor::run(phone_clone, state));
    }

    pub async fn pause_instance(&self, phone: &str, pause: bool) {
        let signal = if pause { "pause" } else { "resume" };
        let _ = self.tx.send(format!("{}:{}", phone, signal));

        let mut workers = self.workers.write().await;
        if let Some(w) = workers.get_mut(phone) {
            w.status = if pause {
                "paused".to_string()
            } else {
                "resuming".to_string()
            };
            w.is_running = !pause;
        }
    }

    pub async fn clear_session(
        &self,
        phone: &str,
        db: &sqlx::SqlitePool,
        redis_client: &redis::Client,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let _ = self.tx.send(format!("{}:stop", phone));
        {
            let mut workers = self.workers.write().await;
            workers.remove(phone);
        }
        let mut conn = redis_client.get_multiplexed_tokio_connection().await?;

        let redis_key = format!("session:{}", phone);
        let pattern = format!("{}:*", phone);

        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(&pattern)
            .query_async(&mut conn)
            .await?;
        if !keys.is_empty() {
            let _: () = redis::cmd("DEL").arg(keys).query_async(&mut conn).await?;
        }
        let _: () = redis::cmd("DEL")
            .arg(&redis_key)
            .query_async(&mut conn)
            .await?;

        let mut tx = db.begin().await?;

        sqlx::query("DELETE FROM sessions WHERE id = ?")
            .bind(phone)
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM session_configurations WHERE sessionId = ?")
            .bind(phone)
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM contacts WHERE sessionId = ?")
            .bind(phone)
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM groups WHERE sessionId = ?")
            .bind(phone)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(())
    }
}
