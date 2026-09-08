import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'poke-search',
  templateUrl: './poke-search.component.html',
  styleUrls: ['./poke-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeSearchComponent {
  readonly term = output<string>();

  onSearch(value: string): void {
    this.term.emit(value);
  }
}
