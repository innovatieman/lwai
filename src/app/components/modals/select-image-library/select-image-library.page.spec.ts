import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectImageLibraryPage } from './select-image-library.page';

describe('SelectImageLibraryPage', () => {
  let component: SelectImageLibraryPage;
  let fixture: ComponentFixture<SelectImageLibraryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectImageLibraryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
