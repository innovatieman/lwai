import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentsPage } from './documents.page';

describe('DocumentsPage', () => {
  let component: DocumentsPage;
  let fixture: ComponentFixture<DocumentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DocumentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
