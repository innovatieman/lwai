import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorialsPage } from './tutorials.page';

describe('TutorialsPage', () => {
  let component: TutorialsPage;
  let fixture: ComponentFixture<TutorialsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorialsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
