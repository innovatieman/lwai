import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnlistPage } from './enlist.page';

describe('EnlistPage', () => {
  let component: EnlistPage;
  let fixture: ComponentFixture<EnlistPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnlistPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
