import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditHtmlPage } from './edit-html.page';

describe('EditHtmlPage', () => {
  let component: EditHtmlPage;
  let fixture: ComponentFixture<EditHtmlPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditHtmlPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
