import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OptionsModalPage } from './options-modal.page';

describe('OptionsModalPage', () => {
  let component: OptionsModalPage;
  let fixture: ComponentFixture<OptionsModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OptionsModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
