use axum::extract::ws::Message;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;

#[derive(Clone)]
pub struct GeminiClient {
    api_key: String,
    client: reqwest::Client,
}

#[derive(Clone)]
pub struct GroqClient {
    api_key: String,
    client: reqwest::Client,
}

impl GeminiClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    pub async fn stream_message<S>(
        &self,
        message: String,
        model: String,
        sender: &mut S,
    ) -> anyhow::Result<()>
    where
        S: SinkExt<Message> + Unpin,
        S::Error: std::fmt::Debug,
    {
        if self.api_key.is_empty() {
            let _ = sender.send(Message::Text(json!({
                "type": "error",
                "content": "Gemini API key not configured"
            }).to_string())).await;
            return Ok(());
        }

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}",
            model, self.api_key
        );

        let body = json!({
            "contents": [{
                "role": "user",
                "parts": [{"text": message}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192,
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
        });

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        let stream = response.bytes_stream();
        let mut stream = std::pin::pin!(stream);

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            let text = String::from_utf8_lossy(&chunk);
            
            for line in text.lines() {
                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data != "[DONE]" {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = parsed.get("candidates")
                                .and_then(|c| c.get(0))
                                .and_then(|c| c.get("content"))
                                .and_then(|c| c.get("parts"))
                                .and_then(|p| p.get(0))
                                .and_then(|p| p.get("text"))
                                .and_then(|t| t.as_str()) {
                                let _ = sender.send(Message::Text(json!({
                                    "type": "content",
                                    "content": content
                                }).to_string())).await;
                            }
                        }
                    }
                }
            }
        }

        let _ = sender.send(Message::Text(json!({
            "type": "done"
        }).to_string())).await;

        Ok(())
    }
}

impl GroqClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    pub async fn stream_message<S>(
        &self,
        message: String,
        model: String,
        sender: &mut S,
    ) -> anyhow::Result<()>
    where
        S: SinkExt<Message> + Unpin,
        S::Error: std::fmt::Debug,
    {
        if self.api_key.is_empty() {
            let _ = sender.send(Message::Text(json!({
                "type": "error",
                "content": "Groq API key not configured"
            }).to_string())).await;
            return Ok(());
        }

        let url = "https://api.groq.com/openai/v1/chat/completions";

        let body = json!({
            "model": model,
            "messages": [
                {"role": "user", "content": message}
            ],
            "temperature": 0.7,
            "max_tokens": 8192,
            "stream": true
        });

        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        let stream = response.bytes_stream();
        let mut stream = std::pin::pin!(stream);

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            let text = String::from_utf8_lossy(&chunk);
            
            for line in text.lines() {
                if line.starts_with("data: ") {
                    let data = &line[6..];
                    if data != "[DONE]" {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = parsed.get("choices")
                                .and_then(|c| c.get(0))
                                .and_then(|c| c.get("delta"))
                                .and_then(|d| d.get("content"))
                                .and_then(|c| c.as_str()) {
                                let _ = sender.send(Message::Text(json!({
                                    "type": "content",
                                    "content": content
                                }).to_string())).await;
                            }
                        }
                    }
                }
            }
        }

        let _ = sender.send(Message::Text(json!({
            "type": "done"
        }).to_string())).await;

        Ok(())
    }
}
