// A 32-bit launcher can run a 64-bit game on a 64-bit Windows installation.
export function systemArchitecture(env = process.env, fallback = process.arch) {
  const value = String(env.PROCESSOR_ARCHITEW6432 || env.PROCESSOR_ARCHITECTURE || fallback).toLowerCase();
  return /arm64|aarch64/.test(value) ? "arm64" : /amd64|x64|x86_64/.test(value) ? "x64" : /x86|ia32/.test(value) ? "ia32" : fallback;
}
export const javaPathArgument = value => "utf8:" + Buffer.from(value, "utf8").toString("base64");
