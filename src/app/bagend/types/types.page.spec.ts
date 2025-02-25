import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypesPage } from './types.page';

describe('TypesPage', () => {
  let component: TypesPage;
  let fixture: ComponentFixture<TypesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TypesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
