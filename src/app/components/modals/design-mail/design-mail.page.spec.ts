import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DesignMailPage } from './design-mail.page';

describe('DesignMailPage', () => {
  let component: DesignMailPage;
  let fixture: ComponentFixture<DesignMailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DesignMailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
