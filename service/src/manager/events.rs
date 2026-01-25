use prost::Message;

#[derive(Clone, PartialEq, Message)]
pub struct WorkerEvent {
    #[prost(oneof = "worker_event::Event", tags = "1, 2")]
    pub event: Option<worker_event::Event>,
}

pub mod worker_event {
    use prost::Oneof;

    #[derive(Clone, PartialEq, Oneof)]
    pub enum Event {
        #[prost(message, tag = "1")]
        Connection(ConnectionEvent),
        #[prost(string, tag = "2")]
        RawLog(String),
    }

    #[derive(Clone, PartialEq, prost::Message)]
    pub struct ConnectionEvent {
        #[prost(string, tag = "1")]
        pub phone: String,
        #[prost(string, tag = "2")]
        pub status: String,
        #[prost(string, tag = "3")]
        pub qr: String,
        #[prost(string, tag = "4")]
        pub pairing_code: String,
    }
}
