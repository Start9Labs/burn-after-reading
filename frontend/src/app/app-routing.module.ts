import { NgModule } from '@angular/core'
import { PreloadAllModules, RouterModule, Routes } from '@angular/router'

const routes: Routes = [
  {
    path: '',
    redirectTo: 'write',
    pathMatch: 'full',
  },
  {
    path: 'write',
    loadChildren: () => import('./pages/write/write.module').then( m => m.WritePageModule),
  },
  {
    path: 'read/:id',
    pathMatch: 'full',
    loadChildren: () => import('./pages/read/read.module').then( m => m.ReadPageModule),
  },
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
