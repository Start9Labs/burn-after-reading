import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class WriteViewModel {
  $state$: BehaviorSubject<WriteViewState> = new BehaviorSubject(WriteViewState.UNAUTH)
}

export enum WriteViewState {
  UNAUTH,
  WRITING,
  FINISHED
}