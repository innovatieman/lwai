import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScormPage } from './scorm.page';

describe('ScormPage', () => {
  let component: ScormPage;
  let fixture: ComponentFixture<ScormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
