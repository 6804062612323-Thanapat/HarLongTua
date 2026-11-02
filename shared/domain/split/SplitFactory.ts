import { EqualSplit } from './EqualSplit';
import { ExactSplit } from './ExactSplit';
import { ItemizedSplit } from './ItemizedSplit';
import { PercentSplit } from './PercentSplit';
import { ShareSplit } from './ShareSplit';
import { SplitData, SplitStrategy } from './SplitStrategy';

/** แปลงข้อมูล JSON กลับเป็นวัตถุวิธีหารที่ถูกชนิด */
export function createSplit(data: SplitData): SplitStrategy {
  switch (data.kind) {
    case 'equal': return new EqualSplit(data.participantIds);
    case 'exact': return new ExactSplit(data.amounts);
    case 'percent': return new PercentSplit(data.percents);
    case 'shares': return new ShareSplit(data.shares);
    case 'itemized': return new ItemizedSplit(data.items, data.servicePct, data.vatPct);
  }
}
