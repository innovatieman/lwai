import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SocialsPage } from './socials.page';

describe('SocialsPage', () => {
  let component: SocialsPage;
  let fixture: ComponentFixture<SocialsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SocialsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
