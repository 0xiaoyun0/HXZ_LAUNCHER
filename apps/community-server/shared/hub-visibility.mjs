// Retained records are not deleted. Both clients and server use this policy to
// keep retired features out of navigation, search and moderation queues.
export const RETIRED_HUB_KINDS = Object.freeze(['project','article','work','landmark','recipe','story','journal']);
export const RETIRED_HUB_SECTIONS = Object.freeze([...RETIRED_HUB_KINDS,'social','devices','desk','challenges']);
export const ACTIVE_HUB_KINDS = Object.freeze(['event','world','program','proposal','ledger','whitelist','appeal']);
export const ACTIVE_HUB_SECTIONS = Object.freeze([...ACTIVE_HUB_KINDS,'servers','space','saved','trades','workbench']);
export const isActiveHubKind = kind => ACTIVE_HUB_KINDS.includes(kind);
export const isActiveHubSection = section => ACTIVE_HUB_SECTIONS.includes(section);
export const retiredHubRedirect = section => section==='challenges'||section==='story'||section==='journal'?'/arcade':['article','work','project','recipe','landmark'].includes(section)?'/community/forum':'/community';
