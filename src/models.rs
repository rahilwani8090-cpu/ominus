use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub role: MessageRole,
    pub content: String,
    pub attachments: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub conversation_id: String,
    pub message_id: String,
    pub content: String,
    pub is_done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAttachment {
    pub id: String,
    pub name: String,
    pub url: String,
    pub mime_type: String,
    pub size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub description: String,
    pub max_tokens: i32,
}

impl ModelConfig {
    pub fn available_models() -> Vec<ModelConfig> {
        vec![
            ModelConfig {
                id: "gemini-2.0-flash".to_string(),
                name: "Gemini 2.0 Flash".to_string(),
                provider: "Google".to_string(),
                description: "Fast and versatile performance".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "gemini-2.0-flash-thinking-exp".to_string(),
                name: "Gemini 2.0 Flash Thinking".to_string(),
                provider: "Google".to_string(),
                description: "Experimental thinking model".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "gemini-2.0-pro-exp".to_string(),
                name: "Gemini 2.0 Pro".to_string(),
                provider: "Google".to_string(),
                description: "Advanced reasoning and coding".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "llama-3.3-70b-versatile".to_string(),
                name: "Llama 3.3 70B".to_string(),
                provider: "Groq".to_string(),
                description: "Powerful open-source model".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "llama-3.1-8b-instant".to_string(),
                name: "Llama 3.1 8B".to_string(),
                provider: "Groq".to_string(),
                description: "Fast and efficient".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "mixtral-8x7b-32768".to_string(),
                name: "Mixtral 8x7B".to_string(),
                provider: "Groq".to_string(),
                description: "Mixture of experts model".to_string(),
                max_tokens: 32768,
            },
            ModelConfig {
                id: "gemma-2-9b-it".to_string(),
                name: "Gemma 2 9B".to_string(),
                provider: "Groq".to_string(),
                description: "Google's efficient model".to_string(),
                max_tokens: 8192,
            },
        ]
    }
}
