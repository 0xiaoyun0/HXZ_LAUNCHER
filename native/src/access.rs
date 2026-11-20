use std::{collections::HashSet, sync::OnceLock};
pub fn guest(action: &str) -> bool {
    static ALLOWED: OnceLock<HashSet<String>> = OnceLock::new();
    let allowed = ALLOWED.get_or_init(|| {
        serde_json::from_str(include_str!("../../engine/guest-actions.json"))
            .expect("valid guest action list")
    });
    allowed.contains(action)
}
pub fn included(action: &str) -> bool {
    !["plugins.", "companion.", "lyrics.", "music.web."]
        .iter()
        .any(|prefix| action.starts_with(prefix))
}
#[test]
fn identity_is_required_for_launch_and_remote_mutation() {
    assert!(included("community.connect"));
    assert!(included("game.launch"));
    assert!(!included("lyrics.update"));
    assert!(guest("state"));
    assert!(guest("settings.save"));
    assert!(!guest("game.launch"));
    assert!(!guest("community.connect"));
    assert!(!guest("vault.open"));
}
