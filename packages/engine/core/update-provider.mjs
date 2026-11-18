import providerPackage from "electron-updater/out/providers/Provider.js";
import { updateFileURL } from "./update-sources.mjs";

// The manifest has already been authenticated. Never fetch unsigned YAML through a proxy.
export class SignedReleaseProvider extends providerPackage.Provider {
  constructor(options, _updater, runtimeOptions) {
    super({ ...runtimeOptions, isUseMultipleRangeRequest: false });
    this.info = options.info;
    this.source = options.source;
  }
  async getLatestVersion() {
    return this.info;
  }
  resolveFiles(info) {
    return [{ url: updateFileURL(this.source, info), info: info.files[0] }];
  }
}
