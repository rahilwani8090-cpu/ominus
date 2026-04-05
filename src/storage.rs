use crate::models::Conversation;
use std::path::PathBuf;
use tokio::fs;
use serde_json;

#[derive(Debug, Clone)]
pub struct ConversationStore {
    data_dir: PathBuf,
}

impl ConversationStore {
    pub fn new() -> Self {
        let data_dir = PathBuf::from("data");
        Self { data_dir }
    }

    pub async fn save(&self, conversation: &Conversation) -> anyhow::Result<()> {
        fs::create_dir_all(&self.data_dir).await?;
        let path = self.data_dir.join(format!("{}.json", conversation.id));
        let json = serde_json::to_string_pretty(conversation)?;
        fs::write(path, json).await?;
        Ok(())
    }

    pub async fn load(&self, id: &str) -> anyhow::Result<Option<Conversation>> {
        let path = self.data_dir.join(format!("{}.json", id));
        if path.exists() {
            let json = fs::read_to_string(path).await?;
            let conversation: Conversation = serde_json::from_str(&json)?;
            Ok(Some(conversation))
        } else {
            Ok(None)
        }
    }

    pub async fn list(&self) -> anyhow::Result<Vec<Conversation>> {
        let mut conversations = Vec::new();
        if self.data_dir.exists() {
            let mut entries = fs::read_dir(&self.data_dir).await?;
            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                if path.extension().map(|e| e == "json").unwrap_or(false) {
                    let json = fs::read_to_string(path).await?;
                    if let Ok(conversation) = serde_json::from_str::<Conversation>(&json) {
                        conversations.push(conversation);
                    }
                }
            }
        }
        Ok(conversations)
    }

    pub async fn delete(&self, id: &str) -> anyhow::Result<()> {
        let path = self.data_dir.join(format!("{}.json", id));
        if path.exists() {
            fs::remove_file(path).await?;
        }
        Ok(())
    }
}

impl Default for ConversationStore {
    fn default() -> Self {
        Self::new()
    }
}
