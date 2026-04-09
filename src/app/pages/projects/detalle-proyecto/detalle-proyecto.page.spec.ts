import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleProyectoPage } from './detalle-proyecto.page';

describe('DetalleProyectoPage', () => {
  let component: DetalleProyectoPage;
  let fixture: ComponentFixture<DetalleProyectoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleProyectoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
