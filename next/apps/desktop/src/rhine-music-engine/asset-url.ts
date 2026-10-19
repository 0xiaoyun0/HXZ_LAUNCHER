/** Same-origin packaged assets; also resolves correctly under Electron file:. */
export const assetUrl = (name: string) => new URL(`media/music/rhine/${name.split('/').pop()}`, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
