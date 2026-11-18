import { nearestOccurrence, wrap, type ArchiveCell, type ArchiveNavigation } from './archive-loop';

/** Each scene owns its music index. No singleton account, activity or network state. */
export class MusicCatalog {
  count = 1;
  private get pageSize() { return Math.ceil(this.count / 5); }
  private start(lane: number) { return wrap(lane - 2, 5) * this.pageSize; }
  private size(lane: number) { return Math.max(1, Math.min(this.pageSize, this.count - this.start(lane))); }
  get repeatRows() {
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    return [0, 1, 2, 3, 4].reduce((period, lane) => period * this.size(lane) / gcd(period, this.size(lane)), 1);
  }
  fileLocation(index: number) {
    const item = wrap(index, this.count);
    const lane = wrap(Math.floor(item / this.pageSize) + 2, 5);
    const row = 12 + item % this.pageSize;
    return {lane, row, slot: lane * 32 + wrap(row, 32)};
  }
  fileAtCell({lane, row}: ArchiveCell) {
    return wrap(this.start(lane) + wrap(row - 12, this.size(lane)), this.count);
  }
  selectionCell(index: number, current: ArchiveCell, navigation?: ArchiveNavigation): ArchiveCell {
    if (navigation && 'cell' in navigation) return {...navigation.cell};
    const next = this.fileLocation(index);
    if (navigation && 'axis' in navigation && navigation.axis === 'row') return {lane: current.lane, row: current.row + navigation.direction};
    return {
      lane: navigation && 'axis' in navigation && navigation.axis === 'lane' ? current.lane + navigation.direction : nearestOccurrence(next.lane, current.lane, 5),
      row: nearestOccurrence(next.row, current.row, this.size(next.lane)),
    };
  }
}
