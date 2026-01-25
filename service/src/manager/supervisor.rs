use crate::AppState;
use crate::manager::events::WorkerEvent;
use crate::manager::events::worker_event::Event;
use prost::Message;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::net::TcpListener;
use tokio::time::{Duration, sleep};

pub async fn run(phone: String, state: Arc<AppState>) {
    let mut rx = state.sm.tx.subscribe();
    let mut is_paused = false;

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind TCP");
    let port = listener.local_addr().unwrap().port();

    loop {
        if is_paused {
            while let Ok(msg) = rx.recv().await {
                let parts: Vec<&str> = msg.splitn(2, ':').collect();
                if parts.get(0) == Some(&phone.as_str()) && parts.get(1) == Some(&"resume") {
                    update_db_status(&phone, "starting", &state).await;
                    is_paused = false;
                    break;
                }
            }
        }

        let mut child = tokio::process::Command::new("bun")
            .args(["run", "client.ts", &phone, &port.to_string()])
            .env("NODE_OPTIONS", "--max-old-space-size=1024")
            .current_dir("../src")
            .kill_on_drop(true)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("Failed to spawn bun");

        let child_id = child.id().unwrap_or(0);

        loop {
            tokio::select! {
                accept_res = listener.accept() => {
                    if let Ok((mut stream, _)) = accept_res {
                        let st = state.clone();
                        let p = phone.clone();
                        tokio::spawn(async move {
                            if let Err(e) = process_socket(&mut stream, st, &p).await {
                                println!("!!! [SUPERVISOR:{}] Socket error: {}", p, e);
                            }
                        });
                    }
                }
                Ok(msg) = rx.recv() => {
                    let parts: Vec<&str> = msg.splitn(2, ':').collect();
                    if parts.get(0) == Some(&phone.as_str()) {
                        match parts.get(1) {
                            Some(cmd) if *cmd == "pause" || *cmd == "stop" => {
                                is_paused = *cmd == "pause";

                                kill_process_tree(child_id).await;

                                let _ = child.wait().await;

                                if *cmd == "pause" {
                                    update_db_status(&phone, "paused", &state).await;
                                }

                                if *cmd == "stop" { return; }
                                break;
                            }
                            _ => {}
                        }
                    }
                }
                _exit_status = child.wait() => {
                    if !is_paused {
                        println!("!!! [SUPERVISOR:{}] Process crashed unexpectedly. Restarting...", phone);
                        update_db_status(&phone, "crashed", &state).await;
                        sleep(Duration::from_secs(5)).await;
                    }
                    break;
                }
            }
        }
    }
}

async fn kill_process_tree(pid: u32) {
    if pid == 0 {
        return;
    }

    let mut kill = tokio::process::Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .spawn()
        .expect("Failed to run taskkill");

    let _ = kill.wait().await;
}

async fn process_socket(
    stream: &mut tokio::net::TcpStream,
    state: Arc<AppState>,
    _phone: &str,
) -> anyhow::Result<()> {
    let mut header = [0u8; 4];
    while stream.read_exact(&mut header).await.is_ok() {
        let len = u32::from_be_bytes(header) as usize;
        let mut buf = vec![0u8; len];
        stream.read_exact(&mut buf).await?;
        if let Ok(event) = WorkerEvent::decode(&buf[..]) {
            handle_event(event, state.clone()).await;
        }
    }
    Ok(())
}

async fn update_db_status(phone: &str, status: &str, state: &Arc<AppState>) {
    let mut workers = state.sm.workers.write().await;
    if let Some(w) = workers.get_mut(phone) {
        w.status = status.to_string();
    }
    let _ = sqlx::query("UPDATE sessions SET status = ? WHERE id = ?")
        .bind(status)
        .bind(phone)
        .execute(&state.db)
        .await;
}

async fn handle_event(event: WorkerEvent, state: Arc<AppState>) {
    let mut workers = state.sm.workers.write().await;
    if let Some(inner_event) = event.event {
        match inner_event {
            Event::Connection(conn) => {
                if let Some(w) = workers.get_mut(&conn.phone) {
                    w.status = conn.status;
                    if !conn.pairing_code.is_empty() {
                        w.pairing_code = Some(conn.pairing_code);
                    } else if !conn.qr.is_empty() {
                        w.pairing_code = Some(conn.qr);
                    }
                }
            }
            Event::RawLog(_) => {}
        }
    }
}
