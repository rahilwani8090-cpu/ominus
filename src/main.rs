use axum::{
    extract::{Path, State, WebSocketUpgrade, Multipart},
    response::{Html, Json, Response},
    routing::{get, post},
    Router,
    http::StatusCode,
};
use futures::stream::StreamExt;
use serde::Deserialize;
use std::sync::Arc;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing::info;
use dashmap::DashMap;
use uuid::Uuid;
use chrono::Utc;

mod api;
mod models;
mod storage;

use api::{GeminiClient, GroqClient};
use models::{ChatMessage, Conversation, MessageRole};
use storage::ConversationStore;

#[derive(Clone)]
struct AppState {
    gemini_client: GeminiClient,
    groq_client: GroqClient,
    conversations: Arc<DashMap<String, Conversation>>,
    store: ConversationStore,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("ominus=info,tower_http=info")
        .init();

    let gemini_api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
    let groq_api_key = std::env::var("GROQ_API_KEY").unwrap_or_default();

    let state = AppState {
        gemini_client: GeminiClient::new(gemini_api_key),
        groq_client: GroqClient::new(groq_api_key),
        conversations: Arc::new(DashMap::new()),
        store: ConversationStore::new(),
    };

    let app = Router::new()
        .route("/", get(index_handler))
        .route("/api/conversations", get(list_conversations).post(create_conversation))
        .route("/api/conversations/:id", get(get_conversation).delete(delete_conversation))
        .route("/api/conversations/:id/messages", post(send_message))
        .route("/api/conversations/:id/stream", get(stream_handler))
        .route("/api/upload", post(upload_file))
        .nest_service("/static", ServeDir::new("static"))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    info!("Ominus AI server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

async fn index_handler() -> Html<&'static str> {
    Html(include_str!("../static/index.html"))
}

async fn list_conversations(State(state): State<AppState>) -> Json<Vec<Conversation>> {
    let conversations: Vec<Conversation> = state.conversations.iter()
        .map(|entry| entry.value().clone())
        .collect();
    Json(conversations)
}

#[derive(Deserialize)]
struct CreateConversationRequest {
    title: Option<String>,
}

async fn create_conversation(
    State(state): State<AppState>,
    Json(req): Json<CreateConversationRequest>,
) -> Json<Conversation> {
    let id = Uuid::new_v4().to_string();
    let conversation = Conversation {
        id: id.clone(),
        title: req.title.unwrap_or_else(|| "New Chat".to_string()),
        messages: vec![],
        created_at: Utc::now(),
        updated_at: Utc::now(),
        model: "gemini-2.0-flash".to_string(),
    };
    state.conversations.insert(id, conversation.clone());
    Json(conversation)
}

async fn get_conversation(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Conversation>, StatusCode> {
    state.conversations
        .get(&id)
        .map(|c| Json(c.clone()))
        .ok_or(StatusCode::NOT_FOUND)
}

async fn delete_conversation(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> StatusCode {
    state.conversations.remove(&id);
    StatusCode::NO_CONTENT
}

#[derive(Deserialize)]
struct SendMessageRequest {
    content: String,
    model: Option<String>,
    attachments: Option<Vec<String>>,
}

async fn send_message(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<SendMessageRequest>,
) -> Result<Json<ChatMessage>, StatusCode> {
    let mut conversation = state.conversations
        .get_mut(&id)
        .ok_or(StatusCode::NOT_FOUND)?;

    let user_message = ChatMessage {
        id: Uuid::new_v4().to_string(),
        role: MessageRole::User,
        content: req.content.clone(),
        attachments: req.attachments.unwrap_or_default(),
        timestamp: Utc::now(),
    };

    conversation.messages.push(user_message);
    conversation.updated_at = Utc::now();

    let _model = req.model.unwrap_or_else(|| conversation.model.clone());
    
    let assistant_message = ChatMessage {
        id: Uuid::new_v4().to_string(),
        role: MessageRole::Assistant,
        content: String::new(),
        attachments: vec![],
        timestamp: Utc::now(),
    };

    let msg_clone = assistant_message.clone();
    conversation.messages.push(msg_clone);

    Ok(Json(assistant_message))
}

async fn stream_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state, id))
}

async fn handle_socket(socket: axum::extract::ws::WebSocket, state: AppState, _conversation_id: String) {
    let (mut sender, mut receiver) = socket.split();

    while let Some(Ok(msg)) = receiver.next().await {
        if let axum::extract::ws::Message::Text(text) = msg {
            let request: serde_json::Value = match serde_json::from_str(&text) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let message = request.get("message").and_then(|v| v.as_str()).unwrap_or("");
            let model = request.get("model").and_then(|v| v.as_str()).unwrap_or("gemini-2.0-flash");

            if model.starts_with("gemini") {
                let _ = state.gemini_client.stream_message(
                    message.to_string(),
                    model.to_string(),
                    &mut sender,
                ).await;
            } else {
                let _ = state.groq_client.stream_message(
                    message.to_string(),
                    model.to_string(),
                    &mut sender,
                ).await;
            }
        }
    }
}

async fn upload_file(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.file_name().unwrap_or("unknown").to_string();
        let data = field.bytes().await.unwrap();
        
        let id = Uuid::new_v4().to_string();
        let path = format!("uploads/{}_{}", id, name);
        
        tokio::fs::create_dir_all("uploads").await.unwrap();
        tokio::fs::write(&path, &data).await.unwrap();

        return Ok(Json(serde_json::json!({
            "id": id,
            "name": name,
            "url": format!("/uploads/{}_{}", id, name),
            "size": data.len()
        })));
    }
    
    Err((StatusCode::BAD_REQUEST, "No file uploaded".to_string()))
}
