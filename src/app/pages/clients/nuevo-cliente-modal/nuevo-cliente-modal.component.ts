import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { Cliente } from 'src/app/models/cliente.model';
import { CpService } from 'src/app/services/cp.service';

addIcons({ closeOutline, saveOutline });

@Component({
  selector: 'app-nuevo-cliente-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ],
  templateUrl: './nuevo-cliente-modal.component.html',
  styleUrls: ['./nuevo-cliente-modal.component.scss']
})
export class NuevoClienteModalComponent implements OnInit {

  clienteForm!: FormGroup;
  
  // Estados de México
  estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Ciudad de México',
    'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
    'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  // Status disponibles
  statusOptions = ['Activo', 'Inactivo', 'Prospecto', 'Con proyecto'];

  // Formas de pago
  formasPago = [
    '01 - Efectivo',
    '02 - Cheque nominativo',
    '03 - Transferencia electrónica',
    '04 - Tarjeta de crédito',
    '28 - Tarjeta de débito',
    '99 - Por definir'
  ];

  // Usos de CFDI
  usosCFDI = [
    'G01 - Adquisición de mercancías',
    'G02 - Devoluciones, descuentos o bonificaciones',
    'G03 - Gastos en general',
    'P01 - Por definir'
  ];

  colonias: string[] = [];

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private cpService: CpService
  ) {}

  ngOnInit() {
    this.inicializarFormulario();
  }

  inicializarFormulario() {
    this.clienteForm = this.fb.group({
      // Campos obligatorios
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      rfc: ['', [Validators.required, Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/)]],
      contacto: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      status: ['Prospecto', [Validators.required]],
      
      // Campos opcionales
      razonSocial: [''],
      ciudad: [''],
      estado: [''],
      calle: [''],
      numExterior: [''],
      numInterior: [''],
      formaPago: [''],
      usoCFDI: [''],
      codigoPostal: [''],
      colonia: [''],
    });
  }

  get f() {
    return this.clienteForm.controls;
  }

  cerrarModal() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  guardarCliente() {
    if (this.clienteForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.clienteForm.controls).forEach(key => {
        this.clienteForm.get(key)?.markAsTouched();
      });
      return;
    }

    const nuevoCliente: Partial<Cliente> = {
      ...this.clienteForm.value,
      fechaRegistro: new Date().toISOString().split('T')[0],
      proyectos: 0
    };

    this.modalCtrl.dismiss(nuevoCliente, 'confirm');
  }

buscarCP() {
  const cp = this.clienteForm.get('codigoPostal')?.value;
  if (!cp || cp.length !== 5) return;

  this.cpService.buscarCP(cp).subscribe({
    next: (resp) => {
      const estadoApi = resp.places[0]?.state ?? '';

      const mapaEstados: { [key: string]: string } = {
        'Distrito Federal': 'Ciudad de México',
        'Baja California Norte': 'Baja California',
        'Veracruz de Ignacio de la Llave': 'Veracruz',
        'Michoacan de Ocampo': 'Michoacán',
        'Coahuila de Zaragoza': 'Coahuila',
      };

      const estadoNormalizado = mapaEstados[estadoApi] ?? estadoApi;

      this.colonias = resp.places.map(p => p['place name']);
      this.clienteForm.patchValue({
        estado: estadoNormalizado,
        ciudad: estadoNormalizado
      });
    },
    error: () => this.colonias = []
  });
}

  // Validaciones visuales
  esInvalido(campo: string): boolean {
    const control = this.clienteForm.get(campo);
    return !!(control && control.invalid && control.touched);
  }

  getMensajeError(campo: string): string {
    const control = this.clienteForm.get(campo);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['pattern']) {
      if (campo === 'rfc') return 'RFC inválido (Ej: ABC123456XYZ)';
      if (campo === 'telefono') return 'Teléfono debe tener 10 dígitos';
    }
    
    return 'Campo inválido';
  }
}