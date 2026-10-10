import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'poke-footer',
  templateUrl: './poke-footer.component.html',
  styleUrls: ['./poke-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeFooterComponent {}
