import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaseCardPage } from './case-card.page';

describe('CaseCardPage', () => {
  let component: CaseCardPage;
  let fixture: ComponentFixture<CaseCardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CaseCardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
