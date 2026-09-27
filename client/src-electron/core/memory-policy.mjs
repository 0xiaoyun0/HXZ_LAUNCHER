// Re-evaluate immediately before launching; do not halve the available memory twice.
export function automaticMemory(totalMB,availableMB){
  const total=Math.max(512,Number(totalMB)||512),available=Math.max(256,Math.min(total,Number(availableMB)||256));
  const reserve=Math.min(2048,Math.max(768,total/8));
  const budget=Math.min(16384,total*.75,Math.max(512,available-reserve));
  return Math.max(512,Math.floor(budget/256)*256);
}
export function javaHeapLimit(requestedMB,totalMB,architecture){
  return Math.max(256,Math.floor(Math.min(Math.max(Number(requestedMB)||4096,512),totalMB*.85,architecture==='ia32'?1280:131072)));
}
