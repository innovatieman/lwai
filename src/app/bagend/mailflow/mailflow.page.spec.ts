import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MailflowPage } from './mailflow.page';

describe('MailflowPage', () => {
  let component: MailflowPage;
  let fixture: ComponentFixture<MailflowPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MailflowPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
