use std::{collections::HashSet, sync::OnceLock};
pub fn guest(action: &str) -> bool {
    static ALLOWED: OnceLock<HashSet<String>> = OnceLock::new();
    let allowed = ALLOWED.get_or_init(|| {
        serde_json::from_str(include_str!("../../engine/guest-actions.json"))
            .expect("valid guest action list")
    });
    allowed.contains(action)
        || (action.starts_with("music.") && !action.starts_with("music.account."))
}
#[test]
fn identity_is_required_for_launch_and_remote_mutation() {
    assert!(guest("state"));
    assert!(guest("settings.save"));
    assert!(!guest("game.launch"));
    assert!(!guest("community.connect"));
    assert!(!guest("vault.open"));
}
