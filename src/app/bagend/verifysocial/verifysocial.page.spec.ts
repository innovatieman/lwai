import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifysocialPage } from './verifysocial.page';

describe('VerifysocialPage', () => {
  let component: VerifysocialPage;
  let fixture: ComponentFixture<VerifysocialPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VerifysocialPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
