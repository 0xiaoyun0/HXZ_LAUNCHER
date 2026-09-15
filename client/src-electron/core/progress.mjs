// Counts completed work only after validation/write succeeds. Bounded by download concurrency.
export function fileProgress(phase, total, emit, unit = "项") {
  let completed = 0,
    received = 0,
    last = 0,
    failed = false;
  const active = new Map();
  function report(force = false) {
    if (failed || (!force && Date.now() - last < 200)) return;
    last = Date.now();
    emit({
      phase,
      total,
      completed,
      unit,
      received,
      activeFiles: [...active.keys()].slice(0, 8)
    });
  }
  report(true);
  return {
    async run(file, operation) {
      active.set(file, true);
      report(active.size === 1 && completed === 0);
      try {
        const value = await operation(n => {
          received += n;
          report();
        });
        active.delete(file);
        completed++;
        report(completed === total);
        return value;
      } catch (error) {
        if (!failed) {
          report(true);
          failed = true;
          error.message = file + ": " + error.message;
        }
        throw error;
      }
    }
  };
}
