import {Component, EventEmitter, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';

@Component({
    selector: 'poke-search',
    templateUrl: './poke-search.component.html',
    styleUrls: ['./poke-search.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PokeSearchComponent implements OnInit {

  @Output() public emmitSearch: EventEmitter<string> = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

  public search(value: string){
    this.emmitSearch.emit(value);
  }
}
