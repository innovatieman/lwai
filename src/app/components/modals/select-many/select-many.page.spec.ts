import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectManyPage } from './select-many.page';

describe('SelectManyPage', () => {
  let component: SelectManyPage;
  let fixture: ComponentFixture<SelectManyPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectManyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
