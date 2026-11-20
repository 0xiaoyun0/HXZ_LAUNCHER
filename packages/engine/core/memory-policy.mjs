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

export function requestedHeap(settings, instance, totalMB, availableMB) {
  const mode = instance?.memoryMode;
  if (mode === 'manual') return instance.memoryMB;
  if (mode !== 'auto' && settings.memoryMode === 'manual') return settings.defaultMemoryMB;
  return automaticMemory(totalMB, availableMB);
}

// Metadata and saved custom arguments can both contain old heap switches.
export function controlledHeapArgs(args, limitMB) {
  return args.filter(arg => !/^(?:-Xmx|-XX:MaxHeapSize=)/i.test(arg)).map(arg => {
    const match = /^(?:-Xms|-XX:InitialHeapSize=)(\d+)([kmgt]?)$/i.exec(arg);
    if (!match) return arg;
    const unit = { k:1024, m:1048576, g:1073741824, t:1099511627776 }[match[2].toLowerCase()] || 1;
    return Number(match[1]) * unit > limitMB * 1048576 ? '-Xms'+limitMB+'M' : arg;
  });
}
