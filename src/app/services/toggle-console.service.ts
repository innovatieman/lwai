import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToggleConsoleService {

  constructor() { }

  disableConsole(): void {
    console.warn(`🚨 Console output is disabled on production!`);
    console.log = function (): void { };
    console.debug = function (): void { };
    console.warn = function (): void { };
    console.info = function (): void { };
  }

}
