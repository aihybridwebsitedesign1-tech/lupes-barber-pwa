# Lupe's Barber Shop - Complete Software Guide

# Guia Completa del Software de Lupe's Barber Shop

---

# TABLE OF CONTENTS / TABLA DE CONTENIDOS

1. [CRITICAL NOTICE / AVISO CRITICO](#critical-notice--aviso-critico)
2. [ENGLISH SECTION](#section-1-english)
   - [Getting Started](#getting-started)
   - [Owner Dashboard](#owner-dashboard-complete-guide)
   - [Barber Dashboard](#barber-dashboard)
   - [Client Booking Experience](#client-booking-experience)
   - [Settings Reference](#settings-reference)
3. [SECCION EN ESPANOL](#seccion-2-espanol)
   - [Como Empezar](#como-empezar)
   - [Panel del Dueno](#panel-del-dueno-guia-completa)
   - [Panel del Barbero](#panel-del-barbero)
   - [Experiencia de Reserva del Cliente](#experiencia-de-reserva-del-cliente)
   - [Referencia de Configuracion](#referencia-de-configuracion)

---

# CRITICAL NOTICE / AVISO CRITICO

## SMS/Text Messages Are Currently PAUSED

The Twilio Account was incorrectly set up as a "Business" instead of "Sole Proprietor". This requires the Owner to submit a new registration with their SSN (Social Security Number).

**The software is 100% ready. The Twilio account type needs correction.**

---

## Los Mensajes de Texto (SMS) Estan PAUSADOS

La cuenta de Twilio se configuro incorrectamente como "Empresa" (Business) en lugar de "Propietario Unico" (Sole Proprietor). Esto requiere que la Duena envie un nuevo registro con su SSN (Numero de Seguro Social).

**El software esta 100% listo. El tipo de cuenta de Twilio necesita correccion.**

---

---

# SECTION 1: ENGLISH

---

## Getting Started

### How to Log In (Owner Account)

1. Go to: **https://admin.lupesbarbershop.com**
2. Enter your credentials:
   - Email: `lupesbarbershop2025@gmail.com`
   - Password: (provided separately)
3. Click **"Sign In"**

### How Barbers Log In

1. Go to: **https://admin.lupesbarbershop.com**
2. Enter barber credentials (each barber has their own email/password)
3. Click **"Sign In"**

### Switching Languages

Click **EN** or **ES** in the top right corner to switch between English and Spanish.

---

## Owner Dashboard Complete Guide

As the Owner, you have access to everything. Here is what each section does:

---

### Today's View

**What it shows:**
- All appointments scheduled for today
- Today's revenue from completed services
- Quick summary of shop activity

**What you can do:**
- Click any appointment to see details
- Create new appointments with the **"+ New Appointment"** button
- See which appointments are paid vs unpaid

---

### Appointments

**What it shows:**
- Complete list of all appointments (past and future)
- Status of each appointment (Booked, Completed, Cancelled, No-Show)
- Payment status (Paid, Unpaid)

**What you can do:**
- **Search:** Find appointments by client name, barber, or service
- **Filter:** Show only certain statuses or date ranges
- **Edit:** Change appointment details (click the blue Edit button)
- **Delete:** Remove appointments (click the red Delete button)
- **Export:** Download all appointments as a spreadsheet (CSV)

---

### Calendar

**What it shows:**
- Week view of all appointments
- Color-coded by barber (each barber has their own color)
- Visual timeline from 8 AM to 8 PM

**What you can do:**
- Navigate weeks with Previous/Next buttons
- Click "Today" to jump to current week
- Filter to show only one barber's appointments
- Click any appointment to see details

---

### Barbers

**What it shows:**
- List of all your barbers (Active and Inactive)

**What you can do:**
- **Add New Barber:** Click "+ New Barber" to create a new barber account
- **Manage:** Set barber permissions (what they can see and do)
- **Edit Schedule:** Set which days/hours each barber works
- **Time Off:** Schedule vacation days or days off
- **Archive:** Deactivate a barber who no longer works there

---

### Clients

**What it shows:**
- Complete client database
- Name, phone number, last visit, total visits

**What you can do:**
- **Search:** Find clients by name or phone
- **Add New Client:** Click "+ New Client"
- **Import:** Upload a list of clients from a spreadsheet
- **Export:** Download your client list as a spreadsheet
- **View Details:** Click any client to see their full history
- **Edit/Delete:** Update or remove client records

---

### Services

**What it shows:**
- All services you offer (Haircut, Beard Trim, etc.)
- Price, duration, and status of each

**What you can do:**
- **Add New Service:** Create new services
- **Edit:** Change price, duration, or name
- **Activate/Deactivate:** Turn services on or off for booking

---

### Products

**What it shows:**
- All products you sell (pomade, shampoo, etc.)
- Price, cost, stock level, brand, category

**What you can do:**
- **Add New Product:** Create new products
- **Edit:** Change price, description, or details
- **Upload Images:** Add product photos
- **Activate/Deactivate:** Turn products on or off

---

### Inventory

**What it shows:**
- Current stock levels for all products
- Status indicators (In Stock, Low Stock, Out of Stock)

**What you can do:**
- **Adjust Stock:** Update quantity when you receive new inventory or do a count
- **Add Notes:** Record why you adjusted (received shipment, count adjustment, etc.)

---

### Payouts (Payroll)

**What it shows:**
- How much each barber has earned in commissions
- Balance of what you owe each barber
- History of all past payouts

**What you can do:**
- **Record Payout:** When you pay a barber, click the green button to record it
- **Export:** Download commission summaries and payout history as spreadsheets

**How commissions work:**
- System automatically calculates based on completed appointments
- Uses commission rates you set in Settings
- Tracks service revenue, product sales, and tips separately

---

### Reports

**What it shows:**
- Business analytics and performance metrics
- Total revenue, tips, appointments, cancellation rate

**Reports available:**
- **By Booking Source:** How appointments were created (Owner, Barber, Online, Walk-In)
- **By Barber:** Each barber's performance
- **By Service:** Which services are most popular
- **Product Sales:** Which products are selling

**What you can do:**
- Change date range (Today, Last 7 Days, Last 30 Days, Custom)
- Export reports as spreadsheets

---

### Time Tracking

**What it shows:**
- When each barber clocked in and out
- Total hours worked
- Break time taken

**What you can do:**
- Filter by date range
- Filter by barber
- Export time data as a spreadsheet

---

### Client Reports

**What it shows:**
- Client health metrics
- Regular clients (visit often)
- Lapsed clients (haven't visited recently)
- New clients

---

### Inventory Reports

**What it shows:**
- Total value of your inventory
- Cost vs retail value
- Potential profit margins

---

### SMS Engage

**What it does:**
- Send individual text messages to clients

**Note:** Currently paused until Twilio account is corrected.

---

### Settings

The Settings page has multiple tabs:

#### Shop Info Tab
- Shop name, address, phone number
- Tax rate and card processing fee
- Social media links (Instagram, Facebook, TikTok)
- Business hours for each day of the week

#### Booking Rules Tab
- How far in advance clients can book (default: 30 days)
- Minimum hours before an appointment can be booked
- Minimum hours before an appointment can be cancelled
- Time slot intervals (15, 30, or 60 minutes)

#### Retention Tab
- Define what makes a "regular" client (number of visits)
- Define when a client is considered "lapsed" (days since last visit)

#### Commissions Tab
- Default commission rate for all barbers
- Individual rates per barber (if some earn different percentages)
- Tipping settings (enable/disable, preset amounts)

#### Payments Tab
- Payment processing configuration

#### Notifications Tab
- SMS reminder timing (how many hours before appointment)
- Option for second reminder

#### Test Mode Tab
- Turn test mode on/off
- Reset test data
- Generate demo data for training

#### Data Tools Tab
- Tools for resetting data (use with caution)

---

### Account Settings

**What you can do:**
- Change your login email
- Change your password

---

## Barber Dashboard

Barbers have a simpler view with only what they need:

---

### Barber - Today's View

**What barbers see:**
- Their appointments for today
- Time clock (Clock In, Break, Clock Out buttons)
- Today's earnings (services, tips, commission)
- Personal booking link to share with clients

**What barbers can do:**
- **Clock In/Out:** Track their work hours
- **Take Breaks:** Record break time
- **Mark Completed:** When a haircut is done, mark it complete
- **Mark No-Show:** When a client doesn't show up
- **Copy Booking Link:** Share their personal link with clients

---

### Barber - My Calendar

**What barbers see:**
- Week view of their own appointments only
- Color-coded by status (blue=booked, green=completed)

**What barbers can do:**
- Navigate between weeks
- Click appointments to see details

---

### Barber - My Earnings (If Permitted)

**What barbers see:**
- Their total earnings for a date range
- Daily breakdown of services, tips, and commission

**Note:** This page is only visible if you give the barber permission in their settings.

---

### Barber - My Account

**What barbers can do:**
- Change their email
- Change their password

---

## Client Booking Experience

This is what your customers see when they visit your booking website.

---

### Client Website: Home Page

**URL:** https://lupesbarbershop.com

**What clients see:**
- Welcome message
- Shop information (address, phone, hours)
- "Book Appointment" button
- Navigation to Services, Barbers, Products

---

### Client Website: Services Page

**What clients see:**
- All your services with prices and duration
- Click any service to start booking

---

### Client Website: Barbers Page

**What clients see:**
- Photos and bios of your barbers
- Specialties and social media links
- "Book with [Name]" button for each barber

---

### The Booking Process (5 Steps)

**Step 1 - Choose Barber:**
Client selects which barber they want

**Step 2 - Choose Service:**
Client selects the service (haircut, beard trim, etc.)

**Step 3 - Choose Date & Time:**
Client picks an available day and time slot

**Step 4 - Enter Contact Info:**
Client enters their name and phone number

**Step 5 - Confirm & Pay:**
- If Stripe is enabled: Client pays online with card
- If Stripe is disabled: Client confirms and pays at the shop

---

### Client - My Appointments

**How clients access:**
1. Click "My Appointments" on the website
2. Enter their phone number
3. Receive a verification code via text
4. Enter the code to see their appointments

**What clients can do:**
- View upcoming appointments
- Reschedule an appointment
- Cancel an appointment
- Pay outstanding balance (if Stripe enabled)

---

## Settings Reference

### Barber Permissions Explained

When you click "Manage" on a barber, you can set these permissions:

| Permission | What It Means |
|------------|---------------|
| Can View Own Stats | Barber can see their earnings page |
| Can Manage Clients | Barber can add/edit client records |
| Can Manage Appointments | Barber can edit/delete appointments |
| Can Send SMS | Barber can send text messages to clients |
| Show on Client Site | Barber appears on the public booking website |
| Accept Online Bookings | Clients can book with this barber online |

---

### Appointment Statuses Explained

| Status | Meaning |
|--------|---------|
| Booked | Appointment is scheduled |
| Completed | Service was provided |
| Cancelled | Client or shop cancelled |
| No-Show | Client didn't arrive |

---

### Payment Statuses Explained

| Status | Meaning |
|--------|---------|
| Unpaid | Payment not yet received |
| Paid | Full payment received |
| Partial | Some payment received |
| Refunded | Payment was returned |

---

---

# SECCION 2: ESPANOL

---

## Como Empezar

### Como Iniciar Sesion (Cuenta de Dueno)

1. Vaya a: **https://admin.lupesbarbershop.com**
2. Ingrese sus credenciales:
   - Correo: `lupesbarbershop2025@gmail.com`
   - Contrasena: (proporcionada por separado)
3. Haga clic en **"Sign In"**

### Como los Barberos Inician Sesion

1. Vayan a: **https://admin.lupesbarbershop.com**
2. Ingresen las credenciales del barbero (cada barbero tiene su propio correo/contrasena)
3. Hagan clic en **"Sign In"**

### Cambiar el Idioma

Haga clic en **EN** o **ES** en la esquina superior derecha para cambiar entre Ingles y Espanol.

---

## Panel del Dueno (Guia Completa)

Como Duena, usted tiene acceso a todo. Aqui esta lo que hace cada seccion:

---

### Vista de Hoy

**Lo que muestra:**
- Todas las citas programadas para hoy
- Los ingresos de hoy por servicios completados
- Resumen rapido de la actividad de la barberia

**Lo que puede hacer:**
- Hacer clic en cualquier cita para ver detalles
- Crear nuevas citas con el boton **"+ New Appointment"**
- Ver cuales citas estan pagadas vs sin pagar

---

### Citas (Appointments)

**Lo que muestra:**
- Lista completa de todas las citas (pasadas y futuras)
- Estado de cada cita (Reservada, Completada, Cancelada, No-Show)
- Estado del pago (Pagado, Sin Pagar)

**Lo que puede hacer:**
- **Buscar:** Encontrar citas por nombre del cliente, barbero, o servicio
- **Filtrar:** Mostrar solo ciertos estados o rangos de fecha
- **Editar:** Cambiar detalles de la cita (clic en el boton azul Edit)
- **Eliminar:** Quitar citas (clic en el boton rojo Delete)
- **Exportar:** Descargar todas las citas como hoja de calculo (CSV)

---

### Calendario

**Lo que muestra:**
- Vista semanal de todas las citas
- Codificado por colores por barbero (cada barbero tiene su propio color)
- Linea de tiempo visual de 8 AM a 8 PM

**Lo que puede hacer:**
- Navegar semanas con botones Anterior/Siguiente
- Hacer clic en "Today" para ir a la semana actual
- Filtrar para mostrar solo las citas de un barbero
- Hacer clic en cualquier cita para ver detalles

---

### Barberos

**Lo que muestra:**
- Lista de todos sus barberos (Activos e Inactivos)

**Lo que puede hacer:**
- **Agregar Nuevo Barbero:** Clic en "+ New Barber" para crear una cuenta nueva
- **Administrar:** Establecer permisos del barbero (lo que pueden ver y hacer)
- **Editar Horario:** Establecer que dias/horas trabaja cada barbero
- **Tiempo Libre:** Programar dias de vacaciones o descanso
- **Archivar:** Desactivar un barbero que ya no trabaja ahi

---

### Clientes

**Lo que muestra:**
- Base de datos completa de clientes
- Nombre, telefono, ultima visita, total de visitas

**Lo que puede hacer:**
- **Buscar:** Encontrar clientes por nombre o telefono
- **Agregar Nuevo Cliente:** Clic en "+ New Client"
- **Importar:** Subir una lista de clientes desde una hoja de calculo
- **Exportar:** Descargar su lista de clientes como hoja de calculo
- **Ver Detalles:** Clic en cualquier cliente para ver su historial completo
- **Editar/Eliminar:** Actualizar o quitar registros de clientes

---

### Servicios

**Lo que muestra:**
- Todos los servicios que ofrece (Corte, Recorte de Barba, etc.)
- Precio, duracion, y estado de cada uno

**Lo que puede hacer:**
- **Agregar Nuevo Servicio:** Crear servicios nuevos
- **Editar:** Cambiar precio, duracion, o nombre
- **Activar/Desactivar:** Encender o apagar servicios para reservas

---

### Productos

**Lo que muestra:**
- Todos los productos que vende (pomada, shampoo, etc.)
- Precio, costo, nivel de inventario, marca, categoria

**Lo que puede hacer:**
- **Agregar Nuevo Producto:** Crear productos nuevos
- **Editar:** Cambiar precio, descripcion, o detalles
- **Subir Imagenes:** Agregar fotos de productos
- **Activar/Desactivar:** Encender o apagar productos

---

### Inventario

**Lo que muestra:**
- Niveles actuales de inventario para todos los productos
- Indicadores de estado (En Stock, Bajo, Agotado)

**Lo que puede hacer:**
- **Ajustar Stock:** Actualizar cantidad cuando recibe inventario nuevo o hace un conteo
- **Agregar Notas:** Registrar por que ajusto (recibio envio, ajuste de conteo, etc.)

---

### Pagos (Nomina)

**Lo que muestra:**
- Cuanto ha ganado cada barbero en comisiones
- Balance de lo que le debe a cada barbero
- Historial de todos los pagos anteriores

**Lo que puede hacer:**
- **Registrar Pago:** Cuando paga a un barbero, clic en el boton verde para registrarlo
- **Exportar:** Descargar resumenes de comisiones e historial de pagos como hojas de calculo

**Como funcionan las comisiones:**
- El sistema calcula automaticamente basado en citas completadas
- Usa las tasas de comision que usted establece en Configuracion
- Rastrea ingresos de servicios, ventas de productos, y propinas por separado

---

### Reportes

**Lo que muestra:**
- Analiticas de negocio y metricas de desempeno
- Ingresos totales, propinas, citas, tasa de cancelacion

**Reportes disponibles:**
- **Por Fuente de Reserva:** Como se crearon las citas (Dueno, Barbero, En Linea, Walk-In)
- **Por Barbero:** Desempeno de cada barbero
- **Por Servicio:** Cuales servicios son mas populares
- **Ventas de Productos:** Cuales productos se venden

**Lo que puede hacer:**
- Cambiar rango de fechas (Hoy, Ultimos 7 Dias, Ultimos 30 Dias, Personalizado)
- Exportar reportes como hojas de calculo

---

### Control de Tiempo

**Lo que muestra:**
- Cuando cada barbero marco entrada y salida
- Total de horas trabajadas
- Tiempo de descanso tomado

**Lo que puede hacer:**
- Filtrar por rango de fechas
- Filtrar por barbero
- Exportar datos de tiempo como hoja de calculo

---

### Reportes de Clientes

**Lo que muestra:**
- Metricas de salud de clientes
- Clientes regulares (visitan frecuentemente)
- Clientes perdidos (no han visitado recientemente)
- Clientes nuevos

---

### Reportes de Inventario

**Lo que muestra:**
- Valor total de su inventario
- Costo vs valor de venta
- Margenes de ganancia potencial

---

### SMS Engage

**Lo que hace:**
- Enviar mensajes de texto individuales a clientes

**Nota:** Actualmente pausado hasta que se corrija la cuenta de Twilio.

---

### Configuracion

La pagina de Configuracion tiene multiples pestanas:

#### Pestana Informacion de la Tienda
- Nombre de la tienda, direccion, telefono
- Tasa de impuesto y tarifa de procesamiento de tarjeta
- Enlaces de redes sociales (Instagram, Facebook, TikTok)
- Horario de atencion para cada dia de la semana

#### Pestana Reglas de Reserva
- Con cuanta anticipacion pueden reservar los clientes (predeterminado: 30 dias)
- Horas minimas antes de que se pueda reservar una cita
- Horas minimas antes de que se pueda cancelar una cita
- Intervalos de tiempo (15, 30, o 60 minutos)

#### Pestana Retencion
- Definir que hace a un cliente "regular" (numero de visitas)
- Definir cuando un cliente se considera "perdido" (dias desde la ultima visita)

#### Pestana Comisiones
- Tasa de comision predeterminada para todos los barberos
- Tasas individuales por barbero (si algunos ganan porcentajes diferentes)
- Configuracion de propinas (habilitar/deshabilitar, montos preestablecidos)

#### Pestana Pagos
- Configuracion de procesamiento de pagos

#### Pestana Notificaciones
- Tiempo de recordatorio SMS (cuantas horas antes de la cita)
- Opcion para segundo recordatorio

#### Pestana Modo de Prueba
- Activar/desactivar modo de prueba
- Reiniciar datos de prueba
- Generar datos de demostracion para entrenamiento

#### Pestana Herramientas de Datos
- Herramientas para reiniciar datos (usar con precaucion)

---

### Configuracion de Cuenta

**Lo que puede hacer:**
- Cambiar su correo de inicio de sesion
- Cambiar su contrasena

---

## Panel del Barbero

Los barberos tienen una vista mas simple con solo lo que necesitan:

---

### Barbero - Vista de Hoy

**Lo que ven los barberos:**
- Sus citas para hoy
- Reloj de tiempo (botones Entrada, Descanso, Salida)
- Ganancias de hoy (servicios, propinas, comision)
- Enlace personal de reservas para compartir con clientes

**Lo que pueden hacer los barberos:**
- **Marcar Entrada/Salida:** Rastrear sus horas de trabajo
- **Tomar Descansos:** Registrar tiempo de descanso
- **Marcar Completado:** Cuando termina un corte, marcarlo como completado
- **Marcar No-Show:** Cuando un cliente no llega
- **Copiar Enlace de Reserva:** Compartir su enlace personal con clientes

---

### Barbero - Mi Calendario

**Lo que ven los barberos:**
- Vista semanal de solo sus propias citas
- Codificado por colores por estado (azul=reservado, verde=completado)

**Lo que pueden hacer los barberos:**
- Navegar entre semanas
- Hacer clic en citas para ver detalles

---

### Barbero - Mis Ganancias (Si Esta Permitido)

**Lo que ven los barberos:**
- Sus ganancias totales para un rango de fechas
- Desglose diario de servicios, propinas, y comision

**Nota:** Esta pagina solo es visible si usted le da permiso al barbero en su configuracion.

---

### Barbero - Mi Cuenta

**Lo que pueden hacer los barberos:**
- Cambiar su correo
- Cambiar su contrasena

---

## Experiencia de Reserva del Cliente

Esto es lo que ven sus clientes cuando visitan su sitio web de reservas.

---

### Sitio Web del Cliente: Pagina de Inicio

**URL:** https://lupesbarbershop.com

**Lo que ven los clientes:**
- Mensaje de bienvenida
- Informacion de la tienda (direccion, telefono, horario)
- Boton "Book Appointment" (Reservar Cita)
- Navegacion a Servicios, Barberos, Productos

---

### Sitio Web del Cliente: Pagina de Servicios

**Lo que ven los clientes:**
- Todos sus servicios con precios y duracion
- Hacer clic en cualquier servicio para comenzar a reservar

---

### Sitio Web del Cliente: Pagina de Barberos

**Lo que ven los clientes:**
- Fotos y biografias de sus barberos
- Especialidades y enlaces de redes sociales
- Boton "Book with [Nombre]" para cada barbero

---

### El Proceso de Reserva (5 Pasos)

**Paso 1 - Elegir Barbero:**
El cliente selecciona que barbero quiere

**Paso 2 - Elegir Servicio:**
El cliente selecciona el servicio (corte, recorte de barba, etc.)

**Paso 3 - Elegir Fecha y Hora:**
El cliente escoge un dia y hora disponible

**Paso 4 - Ingresar Informacion de Contacto:**
El cliente ingresa su nombre y numero de telefono

**Paso 5 - Confirmar y Pagar:**
- Si Stripe esta habilitado: El cliente paga en linea con tarjeta
- Si Stripe esta deshabilitado: El cliente confirma y paga en la tienda

---

### Cliente - Mis Citas

**Como acceden los clientes:**
1. Hacer clic en "My Appointments" en el sitio web
2. Ingresar su numero de telefono
3. Recibir un codigo de verificacion por texto
4. Ingresar el codigo para ver sus citas

**Lo que pueden hacer los clientes:**
- Ver citas proximas
- Reprogramar una cita
- Cancelar una cita
- Pagar balance pendiente (si Stripe esta habilitado)

---

## Referencia de Configuracion

### Permisos de Barbero Explicados

Cuando hace clic en "Manage" en un barbero, puede establecer estos permisos:

| Permiso | Significado |
|---------|-------------|
| Can View Own Stats | El barbero puede ver su pagina de ganancias |
| Can Manage Clients | El barbero puede agregar/editar registros de clientes |
| Can Manage Appointments | El barbero puede editar/eliminar citas |
| Can Send SMS | El barbero puede enviar mensajes de texto a clientes |
| Show on Client Site | El barbero aparece en el sitio web publico de reservas |
| Accept Online Bookings | Los clientes pueden reservar con este barbero en linea |

---

### Estados de Cita Explicados

| Estado | Significado |
|--------|-------------|
| Booked | La cita esta programada |
| Completed | El servicio fue proporcionado |
| Cancelled | El cliente o la tienda cancelo |
| No-Show | El cliente no llego |

---

### Estados de Pago Explicados

| Estado | Significado |
|--------|-------------|
| Unpaid | Pago aun no recibido |
| Paid | Pago completo recibido |
| Partial | Algo de pago recibido |
| Refunded | El pago fue devuelto |

---

---

## Support / Soporte

For technical support during the 3-hour support period, contact the developer.

Para soporte tecnico durante el periodo de 3 horas de soporte, contacte al desarrollador.

---

**Document Version:** 1.0
**Last Updated:** December 13, 2025
