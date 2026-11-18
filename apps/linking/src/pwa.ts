// Host installers own the update lifecycle. Never register a service worker.
export async function initPwa(_notify:(message:string)=>void){}
export function pwaSettingsMarkup(){return '';}
