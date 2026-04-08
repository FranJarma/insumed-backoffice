/**
 * In-memory mock store for development without a real database.
 * Uses Node.js global to persist data across Next.js hot reloads.
 * Activate by setting USE_MOCK_DATA=true in .env.local
 */

export type MockBank = {
  id: string;
  name: string;
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockClient = {
  id: string;
  name: string;
  cuit: string;
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockPatient = {
  id: string;
  name: string;
  clientId: string;
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockProvider = {
  id: string;
  name: string;
  cuit: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockSale = {
  id: string;
  clientId: string;
  invoiceType: "A" | "B";
  invoiceNumber: string;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  documentUrl: string | null;
  creditNoteNumber: string | null;
  creditNoteUrl: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockPurchase = {
  id: string;
  provider: string;
  invoiceNumber: string;
  date: string;
  amount: string;
  status: "PENDING" | "PAID";
  paymentMethod: string | null;
  remito: string | null;
  remitoUrl: string | null;
  category: "PROVEEDOR" | "VARIOS";
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockCheck = {
  id: string;
  type: "EMITIDO" | "RECIBIDO";
  kind: "COMUN" | "DIFERIDO";
  number: string;
  operationNumber: string | null;
  bank: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  estimatedPaymentDate: string | null;
  paymentDate: string | null;
  status: "PENDIENTE" | "DEPOSITADO" | "COBRADO" | "RECHAZADO";
  relatedEntity: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
};

export type MockSaleItem = {
  id: string;
  saleId: string;
  supplyId: string | null;
  pm: string;
  supplyName: string;
  unitMeasure: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  createdAt: Date;
};

export type MockSupply = {
  id: string;
  pm: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unitMeasure: string;
  expiryDate: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
};

type Store = {
  banks: MockBank[];
  clients: MockClient[];
  providers: MockProvider[];
  patients: MockPatient[];
  sales: MockSale[];
  purchases: MockPurchase[];
  checks: MockCheck[];
  supplies: MockSupply[];
  saleItems: MockSaleItem[];
};

declare global {
  // eslint-disable-next-line no-var
  var __mockStore_v3: Store | undefined;
}

function lastMonth(day: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, day)
    .toISOString()
    .split("T")[0];
}
function thisMonth(day: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day)
    .toISOString()
    .split("T")[0];
}

function initStore(): Store {
  const banks: MockBank[] = [
    { id: "bk1", name: "Banco de la Nación Argentina (BNA)", createdAt: new Date("2024-01-01") },
    { id: "bk2", name: "Banco Macro", createdAt: new Date("2024-01-01") },
    { id: "bk3", name: "Supervielle", createdAt: new Date("2024-01-01") },
    { id: "bk4", name: "Banco Galicia", createdAt: new Date("2024-01-01") },
    { id: "bk5", name: "BBVA Argentina", createdAt: new Date("2024-01-01") },
    { id: "bk6", name: "Santander Argentina", createdAt: new Date("2024-01-01") },
    { id: "bk7", name: "HSBC Argentina", createdAt: new Date("2024-01-01") },
    { id: "bk8", name: "Banco Ciudad", createdAt: new Date("2024-01-01") },
    { id: "bk9", name: "Banco Provincia", createdAt: new Date("2024-01-01") },
  ];

  const clients: MockClient[] = [
    { id: "c1", name: "OSDE", cuit: "30-54563559-6", createdAt: new Date("2024-01-01") },
    { id: "c2", name: "Swiss Medical Group", cuit: "30-67726579-3", createdAt: new Date("2024-01-01") },
    { id: "c3", name: "Galeno Argentina", cuit: "30-68539351-5", createdAt: new Date("2024-01-01") },
    { id: "c4", name: "Medicus", cuit: "30-52081635-8", createdAt: new Date("2024-01-01") },
    { id: "c5", name: "OMINT", cuit: "30-52022338-4", createdAt: new Date("2024-01-01") },
  ];

  const providers: MockProvider[] = [
    { id: "p1", name: "Distribuidora Médica SA", cuit: "30-71234567-1", phone: "011-4321-0000", email: "ventas@distribmed.com.ar", address: "Av. Corrientes 1234, CABA", createdAt: new Date("2024-01-01") },
    { id: "p2", name: "Insumos del Sur SRL", cuit: "30-68901234-5", phone: "011-4567-8901", email: "info@insumosdelsur.com.ar", address: "Av. Rivadavia 5678, CABA", createdAt: new Date("2024-01-01") },
    { id: "p3", name: "MedSupply Argentina", cuit: "30-70345678-9", phone: "0341-456-7890", email: "contacto@medsupply.com.ar", address: "San Martín 890, Rosario", createdAt: new Date("2024-02-01") },
    { id: "p4", name: "Laboratorios Norte SA", cuit: "30-65432100-3", phone: "0351-234-5678", email: "pedidos@labnorte.com.ar", address: "Colón 456, Córdoba", createdAt: new Date("2024-02-01") },
  ];

  const patients: MockPatient[] = [
    // OSDE (c1)
    { id: "pt1", name: "García, Juan Carlos", clientId: "c1", createdAt: new Date("2024-01-01") },
    { id: "pt2", name: "Torres, Marta", clientId: "c1", createdAt: new Date("2024-01-01") },
    { id: "pt3", name: "Herrera, Diego", clientId: "c1", createdAt: new Date("2024-01-01") },
    { id: "pt4", name: "Martínez, Pedro", clientId: "c1", createdAt: new Date("2024-01-01") },
    // Swiss Medical (c2)
    { id: "pt5", name: "López, María Elena", clientId: "c2", createdAt: new Date("2024-01-01") },
    { id: "pt6", name: "Díaz, Roberto", clientId: "c2", createdAt: new Date("2024-01-01") },
    { id: "pt7", name: "Jiménez, Lucía", clientId: "c2", createdAt: new Date("2024-01-01") },
    // Galeno (c3)
    { id: "pt8", name: "Rodríguez, Carlos", clientId: "c3", createdAt: new Date("2024-01-01") },
    { id: "pt9", name: "Sánchez, Carlos", clientId: "c3", createdAt: new Date("2024-01-01") },
    { id: "pt10", name: "Álvarez, Claudia", clientId: "c3", createdAt: new Date("2024-01-01") },
    // Medicus (c4)
    { id: "pt11", name: "Fernández, Ana", clientId: "c4", createdAt: new Date("2024-01-01") },
    { id: "pt12", name: "Ruiz, Sergio", clientId: "c4", createdAt: new Date("2024-01-01") },
    { id: "pt13", name: "Vargas, Eduardo", clientId: "c4", createdAt: new Date("2024-01-01") },
    // OMINT (c5)
    { id: "pt14", name: "González, Laura", clientId: "c5", createdAt: new Date("2024-01-01") },
    { id: "pt15", name: "Moreno, Patricia", clientId: "c5", createdAt: new Date("2024-01-01") },
    { id: "pt16", name: "Castro, Valeria", clientId: "c5", createdAt: new Date("2024-01-01") },
  ];

  const sales: MockSale[] = [
    // Mes anterior (marzo)
    { id: "s1", clientId: "c1", invoiceType: "A", invoiceNumber: "FC-A-00001", date: lastMonth(5), oc: "OC-2025-001", patient: "García, Juan Carlos", amount: "185000.00", status: "PAID", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s2", clientId: "c2", invoiceType: "A", invoiceNumber: "FC-A-00002", date: lastMonth(8), oc: "OC-2025-002", patient: "López, María Elena", amount: "97500.00", status: "PAID", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s3", clientId: "c3", invoiceType: "B", invoiceNumber: "FC-B-00001", date: lastMonth(12), oc: "OC-2025-003", patient: "Rodríguez, Carlos", amount: "230000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s4", clientId: "c4", invoiceType: "A", invoiceNumber: "FC-A-00004", date: lastMonth(15), oc: "OC-2025-004", patient: "Fernández, Ana", amount: "75000.00", status: "PAID", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s5", clientId: "c1", invoiceType: "B", invoiceNumber: "FC-B-00002", date: lastMonth(20), oc: "OC-2025-005", patient: "Martínez, Pedro", amount: "312000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s6", clientId: "c5", invoiceType: "A", invoiceNumber: "FC-A-00006", date: lastMonth(22), oc: "OC-2025-006", patient: "González, Laura", amount: "145000.00", status: "PAID", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s7", clientId: "c2", invoiceType: "A", invoiceNumber: "FC-A-00007", date: lastMonth(28), oc: "OC-2025-007", patient: "Díaz, Roberto", amount: "88000.00", status: "CANCELLED", documentUrl: null, creditNoteNumber: "NC-A-00001", creditNoteUrl: "https://example.com/nc-00001.pdf", createdAt: new Date() },
    // Mes actual (abril)
    { id: "s8", clientId: "c3", invoiceType: "A", invoiceNumber: "FC-A-00008", date: thisMonth(1), oc: "OC-2025-008", patient: "Sánchez, Carlos", amount: "420000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s9", clientId: "c1", invoiceType: "A", invoiceNumber: "FC-A-00009", date: thisMonth(1), oc: "OC-2025-009", patient: "Torres, Marta", amount: "190000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s10", clientId: "c4", invoiceType: "A", invoiceNumber: "FC-A-00010", date: thisMonth(2), oc: "OC-2025-010", patient: "Ruiz, Sergio", amount: "98000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s11", clientId: "c5", invoiceType: "A", invoiceNumber: "FC-A-00011", date: thisMonth(2), oc: "OC-2025-011", patient: "Moreno, Patricia", amount: "321000.00", status: "PAID", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s12", clientId: "c2", invoiceType: "B", invoiceNumber: "FC-B-00003", date: thisMonth(3), oc: "OC-2025-012", patient: "Jiménez, Lucía", amount: "167000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s13", clientId: "c1", invoiceType: "B", invoiceNumber: "FC-B-00004", date: thisMonth(5), oc: "OC-2025-013", patient: "Herrera, Diego", amount: "89500.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s14", clientId: "c3", invoiceType: "B", invoiceNumber: "FC-B-00005", date: thisMonth(7), oc: "OC-2025-014", patient: "Álvarez, Claudia", amount: "455000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s15", clientId: "c4", invoiceType: "B", invoiceNumber: "FC-B-00006", date: thisMonth(8), oc: "OC-2025-015", patient: "Vargas, Eduardo", amount: "143000.00", status: "PENDING", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
    { id: "s16", clientId: "c5", invoiceType: "B", invoiceNumber: "FC-B-00007", date: thisMonth(10), oc: "OC-2025-016", patient: "Castro, Valeria", amount: "275000.00", status: "PAID", documentUrl: null, creditNoteNumber: null, creditNoteUrl: null, createdAt: new Date() },
  ];

  const purchases: MockPurchase[] = [
    // Mes anterior (marzo)
    { id: "pu1", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10001", date: lastMonth(10), amount: "95000.00", status: "PAID", paymentMethod: "TRANSFERENCIA", remito: "R-10001", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu2", provider: "Insumos del Sur SRL", invoiceNumber: "FC-B-10002", date: lastMonth(15), amount: "178000.00", status: "PAID", paymentMethod: "CHEQUE", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu3", provider: "MedSupply Argentina", invoiceNumber: "FC-B-10003", date: lastMonth(20), amount: "63000.00", status: "PAID", paymentMethod: "EFECTIVO", remito: "R-10003", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu4", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10004", date: lastMonth(22), amount: "210000.00", status: "PAID", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu5", provider: "Laboratorios Norte SA", invoiceNumber: "FC-B-10005", date: lastMonth(28), amount: "88000.00", status: "PAID", paymentMethod: "CHEQUE", remito: "R-10005", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    // Mes actual (abril)
    { id: "pu6", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10006", date: thisMonth(1), amount: "142000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu7", provider: "Insumos del Sur SRL", invoiceNumber: "FC-B-10007", date: thisMonth(1), amount: "76500.00", status: "PENDING", paymentMethod: "CHEQUE", remito: "R-10007", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu8", provider: "MedSupply Argentina", invoiceNumber: "FC-B-10008", date: thisMonth(2), amount: "218000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu9", provider: "Laboratorios Norte SA", invoiceNumber: "FC-B-10009", date: thisMonth(2), amount: "94000.00", status: "PAID", paymentMethod: "EFECTIVO", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu10", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10010", date: thisMonth(3), amount: "55000.00", status: "PENDING", paymentMethod: "CHEQUE", remito: "R-10010", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu11", provider: "Insumos del Sur SRL", invoiceNumber: "FC-B-10011", date: thisMonth(5), amount: "187000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu12", provider: "MedSupply Argentina", invoiceNumber: "FC-B-10012", date: thisMonth(7), amount: "63000.00", status: "PENDING", paymentMethod: "EFECTIVO", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu13", provider: "Laboratorios Norte SA", invoiceNumber: "FC-B-10013", date: thisMonth(10), amount: "112000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: "R-10013", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu14", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10014", date: thisMonth(11), amount: "340000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu15", provider: "MedSupply Argentina", invoiceNumber: "FC-B-10015", date: thisMonth(12), amount: "89500.00", status: "PENDING", paymentMethod: "CHEQUE", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu16", provider: "Insumos del Sur SRL", invoiceNumber: "FC-B-10016", date: thisMonth(14), amount: "156000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: "R-10016", remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu17", provider: "Laboratorios Norte SA", invoiceNumber: "FC-B-10017", date: thisMonth(15), amount: "274000.00", status: "PENDING", paymentMethod: "CHEQUE", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu18", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10018", date: thisMonth(16), amount: "48500.00", status: "PAID", paymentMethod: "EFECTIVO", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu19", provider: "MedSupply Argentina", invoiceNumber: "FC-B-10019", date: thisMonth(17), amount: "193000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu20", provider: "Insumos del Sur SRL", invoiceNumber: "FC-B-10020", date: thisMonth(18), amount: "67000.00", status: "PENDING", paymentMethod: "EFECTIVO", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu21", provider: "Laboratorios Norte SA", invoiceNumber: "FC-B-10021", date: thisMonth(21), amount: "128000.00", status: "PENDING", paymentMethod: "CHEQUE", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu22", provider: "Distribuidora Médica SA", invoiceNumber: "FC-B-10022", date: thisMonth(22), amount: "415000.00", status: "PENDING", paymentMethod: "TRANSFERENCIA", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    { id: "pu23", provider: "MedSupply Argentina", invoiceNumber: "FC-B-10023", date: thisMonth(24), amount: "72500.00", status: "PENDING", paymentMethod: "CHEQUE", remito: null, remitoUrl: null, category: "PROVEEDOR", createdAt: new Date() },
    // Compras Varias
    { id: "pu24", provider: "Kiosco Don Pedro", invoiceNumber: "TV-001", date: thisMonth(3), amount: "8500.00", status: "PAID", paymentMethod: "EFECTIVO", remito: null, remitoUrl: null, category: "VARIOS", createdAt: new Date() },
    { id: "pu25", provider: "Librería Central", invoiceNumber: "TV-002", date: thisMonth(8), amount: "12300.00", status: "PENDING", paymentMethod: "EFECTIVO", remito: null, remitoUrl: null, category: "VARIOS", createdAt: new Date() },
  ];

  const checks: MockCheck[] = [
    // Con vencimiento en mes anterior
    { id: "ch1", type: "RECIBIDO", kind: "COMUN", number: "55544433", operationNumber: null, bank: "BBVA Argentina", amount: "97500.00", issueDate: lastMonth(1), dueDate: lastMonth(20), estimatedPaymentDate: lastMonth(18), paymentDate: lastMonth(20), status: "COBRADO", relatedEntity: "Swiss Medical Group", notes: null, photoUrl: null, createdAt: new Date() },
    { id: "ch2", type: "EMITIDO", kind: "COMUN", number: "99887766", operationNumber: null, bank: "Santander Argentina", amount: "88000.00", issueDate: lastMonth(10), dueDate: lastMonth(25), estimatedPaymentDate: lastMonth(25), paymentDate: lastMonth(25), status: "COBRADO", relatedEntity: "Laboratorios Norte SA", notes: null, photoUrl: null, createdAt: new Date() },
    // Con vencimiento en mes actual
    { id: "ch3", type: "RECIBIDO", kind: "DIFERIDO", number: "12345678", operationNumber: "OP-2026-001", bank: "Banco de la Nación Argentina (BNA)", amount: "185000.00", issueDate: thisMonth(1), dueDate: thisMonth(10), estimatedPaymentDate: thisMonth(10), paymentDate: null, status: "PENDIENTE", relatedEntity: "OSDE", notes: null, photoUrl: null, createdAt: new Date() },
    { id: "ch4", type: "RECIBIDO", kind: "COMUN", number: "98765432", operationNumber: null, bank: "Banco Galicia", amount: "230000.00", issueDate: thisMonth(1), dueDate: thisMonth(15), estimatedPaymentDate: thisMonth(15), paymentDate: null, status: "PENDIENTE", relatedEntity: "Galeno Argentina", notes: null, photoUrl: null, createdAt: new Date() },
    { id: "ch5", type: "EMITIDO", kind: "DIFERIDO", number: "11223344", operationNumber: "OP-2026-002", bank: "Banco de la Nación Argentina (BNA)", amount: "178000.00", issueDate: thisMonth(2), dueDate: thisMonth(20), estimatedPaymentDate: thisMonth(20), paymentDate: null, status: "PENDIENTE", relatedEntity: "Insumos del Sur SRL", notes: "Pago FC-B-10007", photoUrl: null, createdAt: new Date() },
    { id: "ch6", type: "RECIBIDO", kind: "COMUN", number: "44556677", operationNumber: null, bank: "Banco Macro", amount: "142000.00", issueDate: thisMonth(2), dueDate: thisMonth(22), estimatedPaymentDate: null, paymentDate: null, status: "PENDIENTE", relatedEntity: "Galeno Argentina", notes: null, photoUrl: null, createdAt: new Date() },
    { id: "ch7", type: "EMITIDO", kind: "COMUN", number: "33221100", operationNumber: null, bank: "Supervielle", amount: "76500.00", issueDate: thisMonth(3), dueDate: thisMonth(25), estimatedPaymentDate: null, paymentDate: null, status: "PENDIENTE", relatedEntity: "Distribuidora Médica SA", notes: "Pago FC-B-10006", photoUrl: null, createdAt: new Date() },
    { id: "ch8", type: "RECIBIDO", kind: "DIFERIDO", number: "77889900", operationNumber: "OP-2026-003", bank: "HSBC Argentina", amount: "321000.00", issueDate: thisMonth(3), dueDate: thisMonth(28), estimatedPaymentDate: thisMonth(28), paymentDate: null, status: "PENDIENTE", relatedEntity: "OMINT", notes: null, photoUrl: null, createdAt: new Date() },
    { id: "ch9", type: "RECIBIDO", kind: "COMUN", number: "66554433", operationNumber: null, bank: "Banco Provincia", amount: "167000.00", issueDate: lastMonth(28), dueDate: thisMonth(12), estimatedPaymentDate: thisMonth(12), paymentDate: null, status: "PENDIENTE", relatedEntity: "OMINT", notes: null, photoUrl: null, createdAt: new Date() },
    { id: "ch10", type: "EMITIDO", kind: "COMUN", number: "22334455", operationNumber: null, bank: "Banco Ciudad", amount: "94000.00", issueDate: thisMonth(5), dueDate: thisMonth(30), estimatedPaymentDate: null, paymentDate: null, status: "PENDIENTE", relatedEntity: "Laboratorios Norte SA", notes: "Pago FC-B-10009", photoUrl: null, createdAt: new Date() },
  ];

  const supplies: MockSupply[] = [
    { id: "sp1", pm: "PM-0001", name: "Catéter Venoso Central", description: "Catéter de triple lumen 7Fr x 20cm", unitPrice: "12500.00", unitMeasure: "unidad", expiryDate: "2026-12-31", createdAt: new Date(), deletedAt: null },
    { id: "sp2", pm: "PM-0002", name: "Guantes de Látex Estériles", description: "Talla M, caja x 100 pares", unitPrice: "4800.00", unitMeasure: "caja", expiryDate: "2026-06-30", createdAt: new Date(), deletedAt: null },
    { id: "sp3", pm: "PM-0003", name: "Jeringa 10ml", description: "Con aguja 21G, estéril", unitPrice: "350.00", unitMeasure: "unidad", expiryDate: "2027-03-31", createdAt: new Date(), deletedAt: null },
    { id: "sp4", pm: "PM-0004", name: "Apósito Transparente", description: "10x12cm, film de poliuretano", unitPrice: "2100.00", unitMeasure: "unidad", expiryDate: "2027-01-31", createdAt: new Date(), deletedAt: null },
    { id: "sp5", pm: "PM-0005", name: "Sonda Nasogástrica N°16", description: "PVC flexible, radio-opaca", unitPrice: "3800.00", unitMeasure: "unidad", expiryDate: "2026-09-30", createdAt: new Date(), deletedAt: null },
    { id: "sp6", pm: "PM-0006", name: "Suero Fisiológico 500ml", description: "ClNa 0.9% bolsa flexible", unitPrice: "1850.00", unitMeasure: "unidad", expiryDate: "2026-08-31", createdAt: new Date(), deletedAt: null },
    { id: "sp7", pm: "PM-0007", name: "Gasas Estériles 10x10", description: "Tejido no tejido, paquete x 10", unitPrice: "620.00", unitMeasure: "paquete", expiryDate: null, createdAt: new Date(), deletedAt: null },
    { id: "sp8", pm: "PM-0008", name: "Equipo de Venoclisis", description: "Con filtro de 15 micras y cámara de goteo", unitPrice: "980.00", unitMeasure: "unidad", expiryDate: "2027-06-30", createdAt: new Date(), deletedAt: null },
  ];

  return { banks, clients, providers, patients, sales, purchases, checks, supplies, saleItems: [] };
}

if (!global.__mockStore_v3) {
  global.__mockStore_v3 = initStore();
} else {
  // Migrate store if it was initialized before new fields were added
  const s = initStore();
  if (!global.__mockStore_v3.banks) global.__mockStore_v3.banks = s.banks;
  if (!global.__mockStore_v3.providers) global.__mockStore_v3.providers = s.providers;
  if (!global.__mockStore_v3.checks) global.__mockStore_v3.checks = s.checks;
  if (!global.__mockStore_v3.patients) global.__mockStore_v3.patients = s.patients;
  if (!global.__mockStore_v3.supplies) global.__mockStore_v3.supplies = s.supplies;
  if (!global.__mockStore_v3.saleItems) global.__mockStore_v3.saleItems = [];
  // Add paymentMethod to any purchases that are missing it
  for (const p of global.__mockStore_v3.purchases) {
    if (!("paymentMethod" in p)) (p as MockPurchase).paymentMethod = null;
    if (!("remito" in p)) (p as MockPurchase).remito = null;
    if (!("remitoUrl" in p)) (p as MockPurchase).remitoUrl = null;
    if (!("category" in p)) (p as MockPurchase).category = "PROVEEDOR";
  }
  // Sync invoiceType from fresh initStore data (handles type changes in source)
  for (const freshSale of s.sales) {
    const existing = global.__mockStore_v3.sales.find((s) => s.id === freshSale.id);
    if (existing) existing.invoiceType = freshSale.invoiceType;
    else if (!("invoiceType" in (existing ?? {}))) (existing as unknown as MockSale).invoiceType = "A";
  }
  // Add new check fields to any checks that are missing them
  for (const c of global.__mockStore_v3.checks) {
    if (!("photoUrl" in c)) (c as MockCheck).photoUrl = null;
    if (!("paymentDate" in c)) (c as MockCheck).paymentDate = null;
    if (!("kind" in c)) (c as MockCheck).kind = "COMUN";
    if (!("operationNumber" in c)) (c as MockCheck).operationNumber = null;
    if (!("estimatedPaymentDate" in c)) (c as MockCheck).estimatedPaymentDate = null;
  }
  // Add deletedAt to all entities that are missing it
  const allEntities = [
    ...global.__mockStore_v3.banks,
    ...global.__mockStore_v3.clients,
    ...global.__mockStore_v3.providers,
    ...global.__mockStore_v3.patients,
    ...global.__mockStore_v3.sales,
    ...global.__mockStore_v3.purchases,
    ...global.__mockStore_v3.checks,
    ...(global.__mockStore_v3.supplies ?? []),
  ];
  for (const e of allEntities) {
    if (!("deletedAt" in e)) (e as { deletedAt: null }).deletedAt = null;
  }
}

export const store = global.__mockStore_v3!;

// ─── Patients ─────────────────────────────────────────────────────────────────

export function mockGetPatients(): MockPatient[] {
  return [...store.patients].filter((p) => !p.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}
export function mockGetPatientsWithClient() {
  return [...store.patients]
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      ...p,
      clientName: store.clients.find((c) => c.id === p.clientId)?.name ?? null,
    }));
}
export function mockCreatePatient(data: { name: string; clientId: string }): MockPatient {
  const newPatient: MockPatient = { id: crypto.randomUUID(), ...data, createdAt: new Date(), deletedAt: null };
  store.patients.push(newPatient);
  return newPatient;
}
export function mockUpdatePatient(id: string, data: { name: string; clientId: string }) {
  const p = store.patients.find((p) => p.id === id);
  if (p) Object.assign(p, data);
}
export function mockSoftDeletePatient(id: string) {
  const p = store.patients.find((p) => p.id === id);
  if (p) p.deletedAt = new Date();
}

// ─── Banks ────────────────────────────────────────────────────────────────────

export function mockGetBanks(): MockBank[] {
  return [...store.banks].filter((b) => !b.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}
export function mockCreateBank(data: { name: string }) {
  store.banks.push({ id: crypto.randomUUID(), name: data.name, createdAt: new Date(), deletedAt: null });
}
export function mockUpdateBank(id: string, data: { name: string }) {
  const b = store.banks.find((b) => b.id === id);
  if (b) b.name = data.name;
}
export function mockSoftDeleteBank(id: string) {
  const b = store.banks.find((b) => b.id === id);
  if (b) b.deletedAt = new Date();
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export function mockGetClients(): MockClient[] {
  return [...store.clients].filter((c) => !c.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}
export function mockCreateClient(data: { name: string; cuit: string }): MockClient {
  const newClient: MockClient = { id: crypto.randomUUID(), ...data, createdAt: new Date(), deletedAt: null };
  store.clients.push(newClient);
  return newClient;
}
export function mockUpdateClient(id: string, data: { name: string; cuit: string }) {
  const c = store.clients.find((c) => c.id === id);
  if (c) Object.assign(c, data);
}
export function mockSoftDeleteClient(id: string) {
  const c = store.clients.find((c) => c.id === id);
  if (c) c.deletedAt = new Date();
}

// ─── Providers ───────────────────────────────────────────────────────────────

export function mockGetProviders(): MockProvider[] {
  return [...store.providers].filter((p) => !p.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}
export function mockCreateProvider(data: {
  name: string;
  cuit?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  store.providers.push({
    id: crypto.randomUUID(),
    name: data.name,
    cuit: data.cuit || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    createdAt: new Date(),
    deletedAt: null,
  });
}
export function mockUpdateProvider(id: string, data: { name: string; cuit?: string; phone?: string; email?: string; address?: string }) {
  const p = store.providers.find((p) => p.id === id);
  if (p) Object.assign(p, { ...data, cuit: data.cuit || null, phone: data.phone || null, email: data.email || null, address: data.address || null });
}
export function mockSoftDeleteProvider(id: string) {
  const p = store.providers.find((p) => p.id === id);
  if (p) p.deletedAt = new Date();
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export function mockGetSalesWithClients() {
  return [...store.sales]
    .filter((s) => !s.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((sale) => ({
      ...sale,
      clientName: store.clients.find((c) => c.id === sale.clientId)?.name ?? null,
      items: store.saleItems.filter((i) => i.saleId === sale.id),
    }));
}
export function mockGetSaleItems(saleId: string): MockSaleItem[] {
  return store.saleItems.filter((i) => i.saleId === saleId);
}
export function mockCreateSale(
  data: {
    clientId: string;
    invoiceType?: "A" | "B";
    invoiceNumber: string;
    date: string;
    oc?: string;
    patient?: string;
    amount: string;
    documentUrl?: string;
  },
  items: Array<{
    supplyId: string;
    pm: string;
    supplyName: string;
    unitMeasure: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
  }> = []
) {
  const saleId = crypto.randomUUID();
  store.sales.push({
    id: saleId,
    clientId: data.clientId,
    invoiceType: data.invoiceType || "A",
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    oc: data.oc || null,
    patient: data.patient || null,
    amount: data.amount,
    status: "PENDING",
    documentUrl: data.documentUrl || null,
    creditNoteNumber: null,
    creditNoteUrl: null,
    createdAt: new Date(),
    deletedAt: null,
  });
  for (const item of items) {
    store.saleItems.push({
      id: crypto.randomUUID(),
      saleId,
      supplyId: item.supplyId || null,
      pm: item.pm,
      supplyName: item.supplyName,
      unitMeasure: item.unitMeasure,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      createdAt: new Date(),
    });
  }
}
export function mockUpdateSale(
  id: string,
  data: { clientId: string; invoiceType: "A" | "B"; invoiceNumber: string; date: string; oc?: string; patient?: string; amount: string; },
  items: Array<{ supplyId: string; pm: string; supplyName: string; unitMeasure: string; quantity: string; unitPrice: string; subtotal: string; }> = []
) {
  const s = store.sales.find((s) => s.id === id);
  if (s) Object.assign(s, { ...data, oc: data.oc || null, patient: data.patient || null });
  // Replace items
  store.saleItems = store.saleItems.filter((i) => i.saleId !== id);
  for (const item of items) {
    store.saleItems.push({
      id: crypto.randomUUID(),
      saleId: id,
      supplyId: item.supplyId || null,
      pm: item.pm,
      supplyName: item.supplyName,
      unitMeasure: item.unitMeasure,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      createdAt: new Date(),
    });
  }
}
export function mockSoftDeleteSale(id: string) {
  const s = store.sales.find((s) => s.id === id);
  if (s) s.deletedAt = new Date();
}
export function mockMarkSaleAsPaid(id: string) {
  const s = store.sales.find((s) => s.id === id);
  if (s) s.status = "PAID";
}
export function mockCancelSale(id: string, data: { creditNoteNumber: string; creditNoteUrl: string }) {
  const s = store.sales.find((s) => s.id === id);
  if (s) {
    s.status = "CANCELLED";
    s.creditNoteNumber = data.creditNoteNumber;
    s.creditNoteUrl = data.creditNoteUrl;
  }
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export function mockGetPurchases(): MockPurchase[] {
  return [...store.purchases].filter((p) => !p.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
}
export function mockCreatePurchase(data: {
  provider: string;
  invoiceNumber: string;
  date: string;
  amount: string;
  paymentMethod?: string;
  remito?: string;
  remitoUrl?: string;
  category?: "PROVEEDOR" | "VARIOS";
}) {
  store.purchases.push({
    id: crypto.randomUUID(),
    provider: data.provider,
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    amount: data.amount,
    status: "PENDING",
    paymentMethod: data.paymentMethod || null,
    remito: data.remito || null,
    remitoUrl: data.remitoUrl || null,
    category: data.category || "PROVEEDOR",
    createdAt: new Date(),
    deletedAt: null,
  });
}
export function mockUpdatePurchase(id: string, data: {
  provider: string; invoiceNumber: string; date: string; amount: string;
  paymentMethod?: string; remito?: string;
}) {
  const p = store.purchases.find((p) => p.id === id);
  if (p) Object.assign(p, { ...data, paymentMethod: data.paymentMethod || null, remito: data.remito || null });
}
export function mockSoftDeletePurchase(id: string) {
  const p = store.purchases.find((p) => p.id === id);
  if (p) p.deletedAt = new Date();
}
export function mockMarkPurchaseAsPaid(id: string) {
  const p = store.purchases.find((p) => p.id === id);
  if (p) p.status = "PAID";
}

// ─── Checks ───────────────────────────────────────────────────────────────────

export function mockGetChecks(): MockCheck[] {
  return [...store.checks].filter((c) => !c.deletedAt).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}
export function mockCreateCheck(data: {
  type: "EMITIDO" | "RECIBIDO";
  kind: "COMUN" | "DIFERIDO";
  number: string;
  operationNumber?: string;
  bank: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  estimatedPaymentDate?: string;
  relatedEntity?: string;
  notes?: string;
  photoUrl?: string;
}) {
  store.checks.push({
    id: crypto.randomUUID(),
    type: data.type,
    kind: data.kind,
    number: data.number,
    operationNumber: data.operationNumber || null,
    bank: data.bank,
    amount: data.amount,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    estimatedPaymentDate: data.estimatedPaymentDate || null,
    paymentDate: null,
    status: "PENDIENTE",
    relatedEntity: data.relatedEntity || null,
    notes: data.notes || null,
    photoUrl: data.photoUrl || null,
    createdAt: new Date(),
    deletedAt: null,
  });
}
export function mockUpdateCheck(id: string, data: {
  type: "EMITIDO" | "RECIBIDO"; kind: "COMUN" | "DIFERIDO"; number: string;
  operationNumber?: string; bank: string; amount: string; issueDate: string;
  dueDate: string; estimatedPaymentDate?: string; relatedEntity?: string; notes?: string;
}) {
  const c = store.checks.find((c) => c.id === id);
  if (c) Object.assign(c, {
    ...data,
    operationNumber: data.operationNumber || null,
    estimatedPaymentDate: data.estimatedPaymentDate || null,
    relatedEntity: data.relatedEntity || null,
    notes: data.notes || null,
  });
}
export function mockSoftDeleteCheck(id: string) {
  const c = store.checks.find((c) => c.id === id);
  if (c) c.deletedAt = new Date();
}
export function mockUpdateCheckStatus(id: string, status: MockCheck["status"]) {
  const c = store.checks.find((c) => c.id === id);
  if (c) {
    c.status = status;
    if (status === "COBRADO") {
      c.paymentDate = new Date().toISOString().split("T")[0];
    } else if (status === "PENDIENTE") {
      c.paymentDate = null;
    }
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export function mockGetDashboardData(monthStart: string, monthEnd: string) {
  const salesThisMonth = store.sales.filter(
    (s) => s.status !== "CANCELLED" && s.date >= monthStart && s.date <= monthEnd
  );
  const totalSalesMonth = salesThisMonth.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const purchasesThisMonth = store.purchases.filter(
    (p) => p.date >= monthStart && p.date <= monthEnd
  );
  const totalPurchasesMonth = purchasesThisMonth.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const pendingSales = store.sales.filter((s) => s.status === "PENDING");
  const totalPending = pendingSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const clientTotals: Record<string, number> = {};
  for (const sale of pendingSales) {
    const client = store.clients.find((c) => c.id === sale.clientId);
    if (!client) continue;
    clientTotals[client.name] = (clientTotals[client.name] ?? 0) + parseFloat(sale.amount);
  }
  const topClients = Object.entries(clientTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }));

  return { totalSalesMonth, totalPurchasesMonth, totalPending, topClients };
}

// ─── Supplies ─────────────────────────────────────────────────────────────────

export function mockGetSupplies(): MockSupply[] {
  return [...store.supplies].filter((s) => !s.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
}
export function mockCreateSupply(data: {
  pm: string; name: string; description?: string;
  unitPrice: string; unitMeasure: string; expiryDate?: string;
}): MockSupply {
  const s: MockSupply = {
    id: crypto.randomUUID(),
    pm: data.pm,
    name: data.name,
    description: data.description || null,
    unitPrice: data.unitPrice,
    unitMeasure: data.unitMeasure,
    expiryDate: data.expiryDate || null,
    createdAt: new Date(),
    deletedAt: null,
  };
  store.supplies.push(s);
  return s;
}
export function mockUpdateSupply(id: string, data: {
  pm: string; name: string; description?: string;
  unitPrice: string; unitMeasure: string; expiryDate?: string;
}) {
  const s = store.supplies.find((s) => s.id === id);
  if (s) Object.assign(s, {
    pm: data.pm,
    name: data.name,
    description: data.description || null,
    unitPrice: data.unitPrice,
    unitMeasure: data.unitMeasure,
    expiryDate: data.expiryDate || null,
  });
}
export function mockSoftDeleteSupply(id: string) {
  const s = store.supplies.find((s) => s.id === id);
  if (s) s.deletedAt = new Date();
}
