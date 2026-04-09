import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';

import { Proyecto } from 'src/app/models/proyecto.model';
import { Cliente } from 'src/app/models/cliente.model';
import { SearchService } from 'src/app/services/search.service';

addIcons({ closeOutline, saveOutline });

@Component({
  selector: 'app-nuevo-proyecto-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ],
  templateUrl: './nuevo-proyecto-modal.component.html',
  styleUrls: ['./nuevo-proyecto-modal.component.scss']
})
export class NuevoProyectoModalComponent implements OnInit, OnDestroy {

  proyectoForm!: FormGroup;
  clientes: Cliente[] = [];
  cargandoClientes = false;
  private destroy$ = new Subject<void>();

  statusOptions = ['Activo', 'Finalizado', 'En Pausa', 'Cancelado'];

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private searchService: SearchService
  ) {}

  ngOnInit() {
    this.inicializarFormulario();
    this.cargarClientes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  inicializarFormulario() {
    this.proyectoForm = this.fb.group({
      nombre:      ['', [Validators.required, Validators.minLength(3)]],
      clienteId:   [null, [Validators.required]],
      status:      ['Activo', [Validators.required]],
      presupuesto: [null, [Validators.min(0)]],
      fechaInicio: ['', [Validators.required]],
      fechaFin:    [''],
      descripcion: ['']
    });
  }

  cargarClientes() {
    this.cargandoClientes = true;
    this.searchService.searchClientes('')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {
          this.clientes = clientes;
          this.cargandoClientes = false;
        },
        error: () => {
          this.cargandoClientes = false;
        }
      });
  }

  get f() {
    return this.proyectoForm.controls;
  }

  esInvalido(campo: string): boolean {
    const control = this.proyectoForm.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  getMensajeError(campo: string): string {
    const control = this.proyectoForm.get(campo);
    if (!control?.errors || !control.touched) return '';

    if (control.errors['required'])  return 'Este campo es obligatorio';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['min'])       return 'El presupuesto no puede ser negativo';

    return 'Campo inválido';
  }

  cerrarModal() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  guardarProyecto() {
    if (this.proyectoForm.invalid) {
      Object.keys(this.proyectoForm.controls).forEach(key => {
        this.proyectoForm.get(key)?.markAsTouched();
      });
      return;
    }

    const clienteSeleccionado = this.clientes.find(
      c => Number(c.id) === Number(this.proyectoForm.value.clienteId)
    );

    const nuevoProyecto: Partial<Proyecto> & { clienteId: number } = {
      ...this.proyectoForm.value,
      cliente:    clienteSeleccionado?.nombre ?? '',
      clienteId:  Number(this.proyectoForm.value.clienteId),
      fechaFin:   this.proyectoForm.value.fechaFin || null
    };

    this.modalCtrl.dismiss(nuevoProyecto, 'confirm');
  }
}