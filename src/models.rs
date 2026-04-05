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
                id: "gemini-2.5-flash".to_string(),
                name: "Gemini 2.5 Flash".to_string(),
                provider: "Google".to_string(),
                description: "Latest fast and versatile performance".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "gemini-2.5-flash-lite".to_string(),
                name: "Gemini 2.5 Flash-Lite".to_string(),
                provider: "Google".to_string(),
                description: "Ultra-fast lightweight model".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "gemini-2.5-pro".to_string(),
                name: "Gemini 2.5 Pro".to_string(),
                provider: "Google".to_string(),
                description: "Advanced reasoning and coding".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "gemini-3.1-flash".to_string(),
                name: "Gemini 3.1 Flash".to_string(),
                provider: "Google".to_string(),
                description: "Next-generation performance".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "meta-llama/llama-4-scout-17b-16e-instruct".to_string(),
                name: "Llama 4 Scout".to_string(),
                provider: "Groq".to_string(),
                description: "Llama 4 with 17B params".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "openai/gpt-oss-120b".to_string(),
                name: "GPT OSS 120B".to_string(),
                provider: "Groq".to_string(),
                description: "OpenAI OSS 120B model".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "openai/gpt-oss-20b".to_string(),
                name: "GPT OSS 20B".to_string(),
                provider: "Groq".to_string(),
                description: "OpenAI OSS 20B model".to_string(),
                max_tokens: 8192,
            },
            ModelConfig {
                id: "qwen/qwen3-32b".to_string(),
                name: "Qwen3 32B".to_string(),
                provider: "Groq".to_string(),
                description: "Alibaba Qwen3 model".to_string(),
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
        ]
    }
}
