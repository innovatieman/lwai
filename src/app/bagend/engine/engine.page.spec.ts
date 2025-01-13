import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnginePage } from './engine.page';

describe('EnginePage', () => {
  let component: EnginePage;
  let fixture: ComponentFixture<EnginePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EnginePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
