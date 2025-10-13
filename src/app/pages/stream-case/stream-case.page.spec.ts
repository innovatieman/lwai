import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StreamCasePage } from './stream-case.page';

describe('StreamCasePage', () => {
  let component: StreamCasePage;
  let fixture: ComponentFixture<StreamCasePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StreamCasePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
