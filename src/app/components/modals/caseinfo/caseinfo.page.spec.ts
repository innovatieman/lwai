import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CaseinfoPage } from './caseinfo.page';

describe('CaseinfoPage', () => {
  let component: CaseinfoPage;
  let fixture: ComponentFixture<CaseinfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CaseinfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
