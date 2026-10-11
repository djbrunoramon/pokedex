import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MAX_BASE_STAT, STAT_LABELS } from '../poke-stats/poke-stats.component';

/** The chart's scale is rounded up to a multiple of this. */
const SCALE_STEP = 50;

export interface RadarSeries {
  name: string;
  color: string;
  /** Base stats in `STAT_LABELS` order. */
  values: number[];
}

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 110;
const RINGS = [0.25, 0.5, 0.75, 1];

/** Point at `fraction` of the radius on axis `index` (axis 0 points up). */
function point(index: number, count: number, fraction: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return [CENTER + Math.cos(angle) * RADIUS * fraction, CENTER + Math.sin(angle) * RADIUS * fraction];
}

const polygon = (fractions: number[]) =>
  fractions.map((fraction, i) => point(i, fractions.length, fraction).map((n) => n.toFixed(1)).join(',')).join(' ');

/**
 * Radar chart of base stats with one translucent polygon per Pokémon, overlaid. Visual
 * only: the comparison table next to it carries the same numbers for screen readers.
 */
@Component({
  selector: 'poke-radar',
  templateUrl: './poke-radar.component.html',
  styleUrls: ['./poke-radar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeRadarComponent {
  readonly series = input.required<RadarSeries[]>();

  private readonly labels = Object.values(STAT_LABELS);
  protected readonly viewBox = `-40 -10 ${SIZE + 80} ${SIZE + 20}`;

  protected readonly rings = RINGS.map((ring) => polygon(this.labels.map(() => ring)));

  protected readonly axes = this.labels.map((label, i) => {
    const [x, y] = point(i, this.labels.length, 1);
    const [lx, ly] = point(i, this.labels.length, 1.18);
    return { label, x, y, lx, ly, anchor: Math.abs(lx - CENTER) < 1 ? 'middle' : lx > CENTER ? 'start' : 'end' };
  });

  protected readonly center = CENTER;

  /**
   * Outer ring: the highest stat compared, rounded up — on a fixed 255 scale most
   * Pokémon would crowd the middle and their differences would be hard to see.
   */
  private readonly scale = computed(() => {
    const highest = Math.max(SCALE_STEP, ...this.series().flatMap((series) => series.values));
    return Math.min(Math.ceil(highest / SCALE_STEP) * SCALE_STEP, MAX_BASE_STAT);
  });

  protected readonly shapes = computed(() =>
    this.series().map(({ name, color, values }) => ({
      name,
      color,
      points: polygon(values.map((value) => Math.min(1, value / this.scale()))),
    })),
  );
}
