use axum::response::sse::{Event, Sse};
use futures::stream::{self, Stream};
use serde::Serialize;
use std::{convert::Infallible, time::Duration};
use sysinfo::{Disks, System};
use tokio_stream::StreamExt as _;

#[derive(Serialize)]
pub struct SystemStats {
    pub cpu: f32,
    pub memory: f32,
    pub disk: f32,
}

pub async fn system_stream() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut sys = System::new_all();
    let mut disks = Disks::new_with_refreshed_list();

    let stream = stream::repeat_with(move || {
        sys.refresh_cpu_all();
        sys.refresh_memory();

        disks.refresh_list();

        let cpu_usage = sys.global_cpu_usage();
        let mem_usage = (sys.used_memory() as f32 / sys.total_memory() as f32) * 100.0;

        let disk_usage = disks
            .iter()
            .find(|d| {
                d.mount_point() == std::path::Path::new("/")
                    || d.mount_point() == std::path::Path::new("C:\\")
            })
            .map(|d| {
                let used = d.total_space() - d.available_space();
                (used as f32 / d.total_space() as f32) * 100.0
            })
            .unwrap_or(0.0);

        let stats = SystemStats {
            cpu: cpu_usage,
            memory: mem_usage,
            disk: disk_usage,
        };

        Ok(Event::default().json_data(stats).unwrap())
    })
    .throttle(Duration::from_secs(2));

    Sse::new(stream)
}
