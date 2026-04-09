import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonBadge, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonModal,
  IonFab, IonFabButton, IonSearchbar, IonChip,
  IonList, IonItemSliding, IonItemOptions, IonItemOption,
  IonNote, IonGrid, IonRow, IonCol, IonSpinner,
  AlertController, ToastController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, trashOutline, createOutline, eyeOutline,
  cartOutline, checkmarkCircleOutline, closeCircleOutline,
  timeOutline, receiptOutline, filterOutline, downloadOutline,
  addCircleOutline, removeCircleOutline
} from 'ionicons/icons';
import { Compra, CompraItem, CompraStatus, CompraCategoria, CompraFilters } from 'src/app/models/compra.model';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonBadge, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonModal, IonChip,
    IonFab, IonFabButton, IonSearchbar,
    IonList, IonItemSliding, IonItemOptions, IonItemOption, IonGrid, IonRow, IonCol, IonSpinner
  ],
  templateUrl: './compras.page.html',
  styleUrls: ['./compras.page.scss']
})
export class ComprasPage implements OnInit {

  // ── Estado ──────────────────────────────────────────────────────────────
  compras = signal<Compra[]>([]);
  cargando = signal(false);
  modalAbierto = signal(false);
  modoEdicion = signal(false);
  compraSeleccionada = signal<Compra | null>(null);
  busqueda = signal('');
  filtroStatus = signal<CompraStatus | ''>('');
  filtroCategoria = signal<CompraCategoria | ''>('');

  compraForm!: FormGroup;

  readonly statusOpciones: { valor: CompraStatus; etiqueta: string; color: string }[] = [
    { valor: 'pendiente',  etiqueta: 'Pendiente',  color: 'warning'  },
    { valor: 'aprobada',   etiqueta: 'Aprobada',   color: 'primary'  },
    { valor: 'recibida',   etiqueta: 'Recibida',   color: 'success'  },
    { valor: 'cancelada',  etiqueta: 'Cancelada',  color: 'danger'   },
  ];

  readonly categoriaOpciones: { valor: CompraCategoria; etiqueta: string }[] = [
    { valor: 'material',  etiqueta: 'Material'  },
    { valor: 'servicio',  etiqueta: 'Servicio'  },
    { valor: 'equipo',    etiqueta: 'Equipo'    },
    { valor: 'otro',      etiqueta: 'Otro'      },
  ];

  // ── Computed ─────────────────────────────────────────────────────────────
  comprasFiltradas = computed(() => {
    const q     = this.busqueda().toLowerCase();
    const st    = this.filtroStatus();
    const cat   = this.filtroCategoria();
    return this.compras().filter(c => {
      const matchQ   = !q  || c.proveedor.toLowerCase().includes(q) || (c.folio ?? '').toLowerCase().includes(q);
      const matchSt  = !st  || c.status === st;
      const matchCat = !cat || c.categoria === cat;
      return matchQ && matchSt && matchCat;
    });
  });

  totalCompras = computed(() =>
    this.comprasFiltradas().reduce((acc, c) => acc + c.total, 0)
  );

  countPorStatus = computed(() => {
    const all = this.compras();
    return {
      pendiente: all.filter(c => c.status === 'pendiente').length,
      aprobada:  all.filter(c => c.status === 'aprobada').length,
      recibida:  all.filter(c => c.status === 'recibida').length,
      cancelada: all.filter(c => c.status === 'cancelada').length,
    };
  });

  constructor(
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      addOutline, trashOutline, createOutline, eyeOutline,
      cartOutline, checkmarkCircleOutline, closeCircleOutline,
      timeOutline, receiptOutline, filterOutline, downloadOutline,
      addCircleOutline, removeCircleOutline
    });
  }

  ngOnInit() {
    this.initForm();
    this.cargarComprasMock();
  }

  // ── Formulario ────────────────────────────────────────────────────────
  initForm(compra?: Compra) {
    this.compraForm = this.fb.group({
      proveedor:    [compra?.proveedor   ?? '', Validators.required],
      categoria:    [compra?.categoria   ?? 'material', Validators.required],
      proyectoId:   [compra?.proyectoId  ?? null],
      proyecto:     [compra?.proyecto    ?? ''],
      status:       [compra?.status      ?? 'pendiente', Validators.required],
      fechaCompra:  [compra?.fechaCompra ?? this.hoy(), Validators.required],
      fechaEntrega: [compra?.fechaEntrega ?? ''],
      factura:      [compra?.factura     ?? ''],
      notas:        [compra?.notas       ?? ''],
      items: this.fb.array(
        compra?.items?.map(i => this.crearItemGroup(i)) ?? [this.crearItemGroup()]
      )
    });
  }

  crearItemGroup(item?: CompraItem): FormGroup {
    const g = this.fb.group({
      descripcion:    [item?.descripcion    ?? '', Validators.required],
      cantidad:       [item?.cantidad       ?? 1,  [Validators.required, Validators.min(1)]],
      precioUnitario: [item?.precioUnitario ?? 0,  [Validators.required, Validators.min(0)]],
      subtotal:       [{ value: item?.subtotal ?? 0, disabled: true }]
    });
    // recalcular subtotal al cambiar cantidad o precio
    g.get('cantidad')?.valueChanges.subscribe(() => this.recalcularItem(g));
    g.get('precioUnitario')?.valueChanges.subscribe(() => this.recalcularItem(g));
    return g;
  }

  recalcularItem(g: FormGroup) {
    const qty   = +(g.get('cantidad')?.value       ?? 0);
    const price = +(g.get('precioUnitario')?.value ?? 0);
    g.get('subtotal')?.setValue(qty * price, { emitEvent: false });
  }

  get itemsArray(): FormArray {
    return this.compraForm.get('items') as FormArray;
  }

  agregarItem() {
    this.itemsArray.push(this.crearItemGroup());
  }

  eliminarItem(i: number) {
    if (this.itemsArray.length > 1) this.itemsArray.removeAt(i);
  }

  totalForm(): number {
    return this.itemsArray.controls.reduce((acc, ctrl) => {
      const qty   = +(ctrl.get('cantidad')?.value       ?? 0);
      const price = +(ctrl.get('precioUnitario')?.value ?? 0);
      return acc + qty * price;
    }, 0);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────
  abrirNueva() {
    this.modoEdicion.set(false);
    this.compraSeleccionada.set(null);
    this.initForm();
    this.modalAbierto.set(true);
  }

  abrirEdicion(compra: Compra) {
    this.modoEdicion.set(true);
    this.compraSeleccionada.set(compra);
    this.initForm(compra);
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  async guardar() {
    if (this.compraForm.invalid) {
      this.compraForm.markAllAsTouched();
      return;
    }

    const raw   = this.compraForm.getRawValue();
    const items: CompraItem[] = raw.items.map((i: any) => ({
      descripcion:    i.descripcion,
      cantidad:       +i.cantidad,
      precioUnitario: +i.precioUnitario,
      subtotal:       +i.subtotal
    }));

    const compra: Compra = {
      ...raw,
      items,
      total: this.totalForm(),
      folio: this.modoEdicion()
        ? this.compraSeleccionada()!.folio
        : this.generarFolio()
    };

    if (this.modoEdicion()) {
      this.compras.update(list =>
        list.map(c => c.id === this.compraSeleccionada()!.id ? { ...compra, id: c.id } : c)
      );
    } else {
      this.compras.update(list => [{ ...compra, id: Date.now() }, ...list]);
    }

    this.cerrarModal();
    await this.mostrarToast(
      this.modoEdicion() ? 'Compra actualizada' : 'Compra registrada',
      'success'
    );
  }

  async confirmarEliminar(compra: Compra) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar compra',
      message: `¿Eliminar la compra de <strong>${compra.proveedor}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.compras.update(list => list.filter(c => c.id !== compra.id));
            this.mostrarToast('Compra eliminada', 'danger');
          }
        }
      ]
    });
    await alert.present();
  }

  async cambiarStatus(compra: Compra, nuevoStatus: CompraStatus) {
    this.compras.update(list =>
      list.map(c => c.id === compra.id ? { ...c, status: nuevoStatus } : c)
    );
    await this.mostrarToast(`Estado → ${nuevoStatus}`, 'primary');
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  colorStatus(status: CompraStatus): string {
    return this.statusOpciones.find(s => s.valor === status)?.color ?? 'medium';
  }

  etiquetaStatus(status: CompraStatus): string {
    return this.statusOpciones.find(s => s.valor === status)?.etiqueta ?? status;
  }

  etiquetaCategoria(cat: CompraCategoria): string {
    return this.categoriaOpciones.find(c => c.valor === cat)?.etiqueta ?? cat;
  }

  hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  generarFolio(): string {
    const n = String(this.compras().length + 1).padStart(4, '0');
    return `OC-${new Date().getFullYear()}-${n}`;
  }

  async mostrarToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({
      message: msg, duration: 2500, color, position: 'bottom'
    });
    await t.present();
  }

  onBusqueda(ev: any) { this.busqueda.set(ev.detail.value ?? ''); }

  limpiarFiltros() {
    this.busqueda.set('');
    this.filtroStatus.set('');
    this.filtroCategoria.set('');
  }

  trackById(_: number, c: Compra) { return c.id; }

  // ── Mock data ────────────────────────────────────────────────────────
  cargarComprasMock() {
    this.compras.set([
      {
        id: 1, folio: 'OC-2025-0001', proveedor: 'Materiales García S.A.',
        categoria: 'material', proyecto: 'Remodelación Oficina', proyectoId: 1,
        status: 'recibida', fechaCompra: '2025-03-01', fechaEntrega: '2025-03-05',
        factura: 'FAC-001', notas: 'Entrega completada',
        items: [{ descripcion: 'Cemento 50kg', cantidad: 20, precioUnitario: 85, subtotal: 1700 }],
        total: 1700
      },
      {
        id: 2, folio: 'OC-2025-0002', proveedor: 'Tech Solutions',
        categoria: 'equipo', proyecto: 'Sistema ERP', proyectoId: 2,
        status: 'aprobada', fechaCompra: '2025-03-10',
        items: [{ descripcion: 'Laptop Dell Vostro', cantidad: 3, precioUnitario: 18500, subtotal: 55500 }],
        total: 55500
      },
      {
        id: 3, folio: 'OC-2025-0003', proveedor: 'Servicios Integrales',
        categoria: 'servicio', status: 'pendiente', fechaCompra: '2025-03-15',
        items: [{ descripcion: 'Consultoría mensual', cantidad: 1, precioUnitario: 12000, subtotal: 12000 }],
        total: 12000
      }
    ]);
  }
}