import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoUsuarioPage } from './nuevo-usuario.page';

describe('NuevoUsuarioPage', () => {
  let component: NuevoUsuarioPage;
  let fixture: ComponentFixture<NuevoUsuarioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevoUsuarioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
