import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { DetailsComponent } from './pages/details/details.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Pokédex' },
  { path: 'details/:id', component: DetailsComponent },
  { path: 'favoritos', component: FavoritesComponent, title: 'Meus favoritos | Pokédex' },
  { path: '**', component: NotFoundComponent, title: 'Página não encontrada | Pokédex' },
];
