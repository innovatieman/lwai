import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoItemsPage } from './info-items.page';

describe('InfoItemsPage', () => {
  let component: InfoItemsPage;
  let fixture: ComponentFixture<InfoItemsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoItemsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
