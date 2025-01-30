import {Component, HostListener, Input,  } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.page.html',
  styleUrls: ['./tooltip.page.scss'],
})
export class TooltipPage{
  @Input() text: string = '';

  constructor() {}

  @HostListener('mouseleave', ['$event'])
  onMouseLeave(e: MouseEvent) {
    setTimeout(() => {
      const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
      if (!document.querySelector('.tooltip') && !document.querySelector('.infoIcon')) {
        document.querySelectorAll('app-tooltip').forEach(el => el.remove());
      }
    }, 300);
  }
}