import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhotoGeneratorPage } from './photo-generator.page';

describe('PhotoGeneratorPage', () => {
  let component: PhotoGeneratorPage;
  let fixture: ComponentFixture<PhotoGeneratorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PhotoGeneratorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
