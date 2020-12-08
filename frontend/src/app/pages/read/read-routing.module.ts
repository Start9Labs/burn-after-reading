import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { ReadPage } from './read.page'

const routes: Routes = [
  {
    path: '',
    component: ReadPage,
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReadPageRoutingModule { }
