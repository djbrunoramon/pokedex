import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'poke-header',
    templateUrl: './poke-header.component.html',
    styleUrls: ['./poke-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PokeHeaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
