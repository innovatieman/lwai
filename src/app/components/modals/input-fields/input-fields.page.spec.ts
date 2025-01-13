import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputFieldsPage } from './input-fields.page';

describe('InputFieldsPage', () => {
  let component: InputFieldsPage;
  let fixture: ComponentFixture<InputFieldsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InputFieldsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
