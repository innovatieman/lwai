import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiOrganisationPage } from './ai-organisation.page';

describe('AiOrganisationPage', () => {
  let component: AiOrganisationPage;
  let fixture: ComponentFixture<AiOrganisationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AiOrganisationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
