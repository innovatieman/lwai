import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CasesPage } from './cases.page';

describe('CasesPage', () => {
  let component: CasesPage;
  let fixture: ComponentFixture<CasesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CasesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
