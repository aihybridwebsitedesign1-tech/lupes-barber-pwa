# Owner Handbook - Lupe's Barber Control Panel
# Manual del Propietario - Panel de Control de Lupe's Barber

## Table of Contents / Tabla de Contenidos

1. [Logging In & User Roles](#logging-in--user-roles)
2. [Managing Your Barbers](#managing-your-barbers)
3. [Shop Settings](#shop-settings)
4. [Services & Products](#services--products)
5. [Appointments](#appointments)
6. [Time Tracking & Commissions](#time-tracking--commissions)
7. [Test Mode & Test Data Cleanup](#test-mode--test-data-cleanup)
8. [What Still Requires Setup](#what-still-requires-setup)

---

## Logging In & User Roles

**English:**

When you open the app, you'll see a login screen. Use your email and password to sign in.

There are three types of users in the system:

- **Owner (You):** Full access to everything - manage barbers, view all appointments, change settings, access reports.
- **Barber:** Can view their own schedule, clock in/out for time tracking, and see their appointments. Cannot change shop settings.
- **Client:** Can book appointments online, view their booking history, and cancel/reschedule appointments.

As the owner, your dashboard shows:
- Today's appointments and revenue
- Quick access to manage barbers, services, products, and clients
- Reports and analytics
- Settings to control how the shop operates

**Español:**

Cuando abres la aplicación, verás una pantalla de inicio de sesión. Usa tu correo electrónico y contraseña para entrar.

Hay tres tipos de usuarios en el sistema:

- **Propietario (Tú):** Acceso completo a todo - gestionar barberos, ver todas las citas, cambiar configuraciones, acceder a informes.
- **Barbero:** Puede ver su propio horario, marcar entrada/salida para seguimiento de tiempo, y ver sus citas. No puede cambiar configuraciones de la tienda.
- **Cliente:** Puede reservar citas en línea, ver su historial de reservas, y cancelar/reprogramar citas.

Como propietario, tu panel muestra:
- Las citas y los ingresos del día
- Acceso rápido para gestionar barberos, servicios, productos y clientes
- Informes y análisis
- Configuraciones para controlar cómo opera la tienda

---

## Managing Your Barbers

**English:**

### Adding a New Barber

1. Go to "Barbers" in the main menu
2. Click "Add Barber"
3. Fill in the details:
   - **Name:** Their full name
   - **Email:** They'll use this to log in
   - **Phone:** Optional, for internal use
   - **Commission Rate:** Percentage they earn per service (e.g., 60 means they get 60%)
   - **Photo:** Upload a professional photo (shows on client booking site)
   - **Public Display Name:** The name clients will see (can be a nickname)
   - **Bio:** A short description that appears on the public website

4. Set their permissions:
   - **Can Book Appointments:** Allow them to create appointments in the system
   - **Can Send SMS:** Allow them to send text messages to clients
   - **Show on Client Website:** Their profile appears on the public barber list
   - **Accept Online Bookings:** Clients can book with this barber online

5. Set their schedule (which days and hours they work)

### Important Settings Explained

**Show on Client Website vs Accept Online Bookings:**

- **Show on Client Website:** If checked, clients browsing your website can see this barber's profile, photo, and bio. Good for marketing your team.
- **Accept Online Bookings:** If checked, clients can actually book appointments with this barber online. You might uncheck this for a new barber who isn't ready yet, or for a senior stylist who only takes walk-ins.

**Active vs Inactive:**

- An **active** barber can log in and work normally
- An **inactive** barber cannot log in and won't appear in any client-facing lists
- Use this instead of deleting barbers when someone leaves - you keep their history

### Editing Schedules

Each barber has a weekly schedule. Click "Edit Schedule" next to their name to set:
- Which days they work
- Start and end times for each day
- You can mark days as "closed" if they don't work that day

### Time Off

If a barber is on vacation or sick, use "Request Time Off" to block dates. During those days:
- Clients cannot book appointments with them
- The owner won't try to schedule them

**Español:**

### Agregar un Nuevo Barbero

1. Ve a "Barberos" en el menú principal
2. Haz clic en "Agregar Barbero"
3. Completa los detalles:
   - **Nombre:** Su nombre completo
   - **Correo Electrónico:** Lo usarán para iniciar sesión
   - **Teléfono:** Opcional, para uso interno
   - **Tasa de Comisión:** Porcentaje que ganan por servicio (ej: 60 significa que obtienen 60%)
   - **Foto:** Sube una foto profesional (se muestra en el sitio de reservas del cliente)
   - **Nombre Público:** El nombre que verán los clientes (puede ser un apodo)
   - **Biografía:** Una breve descripción que aparece en el sitio web público

4. Establece sus permisos:
   - **Puede Reservar Citas:** Permitirles crear citas en el sistema
   - **Puede Enviar SMS:** Permitirles enviar mensajes de texto a los clientes
   - **Mostrar en Sitio Web del Cliente:** Su perfil aparece en la lista pública de barberos
   - **Aceptar Reservas en Línea:** Los clientes pueden reservar con este barbero en línea

5. Establece su horario (qué días y horas trabajan)

### Configuraciones Importantes Explicadas

**Mostrar en Sitio Web vs Aceptar Reservas en Línea:**

- **Mostrar en Sitio Web:** Si está marcado, los clientes que navegan tu sitio web pueden ver el perfil, foto y biografía de este barbero. Bueno para promocionar tu equipo.
- **Aceptar Reservas en Línea:** Si está marcado, los clientes pueden reservar citas con este barbero en línea. Podrías desmarcar esto para un barbero nuevo que aún no está listo, o para un estilista senior que solo acepta clientes sin cita.

**Activo vs Inactivo:**

- Un barbero **activo** puede iniciar sesión y trabajar normalmente
- Un barbero **inactivo** no puede iniciar sesión y no aparecerá en ninguna lista pública
- Usa esto en lugar de eliminar barberos cuando alguien se va - conservas su historial

### Editar Horarios

Cada barbero tiene un horario semanal. Haz clic en "Editar Horario" junto a su nombre para establecer:
- Qué días trabajan
- Horas de inicio y fin para cada día
- Puedes marcar días como "cerrado" si no trabajan ese día

### Tiempo Libre

Si un barbero está de vacaciones o enfermo, usa "Solicitar Tiempo Libre" para bloquear fechas. Durante esos días:
- Los clientes no pueden reservar citas con ellos
- El propietario no intentará programarlos

---

## Shop Settings

**English:**

Go to "Settings" in the main menu to control how your shop operates.

### Booking Rules

These control how far in advance clients can book:

- **Days Bookable in Advance:** How many days ahead clients can book (e.g., 30 means they can book up to 30 days from today)
- **Minimum Hours Notice:** How much warning you need (e.g., 2 means clients must book at least 2 hours before the appointment)
- **Minimum Hours to Cancel:** How much notice clients must give to cancel (e.g., 4 means they must cancel at least 4 hours ahead)
- **Booking Interval:** Time slots clients see (e.g., 30 means they can book every 30 minutes like 9:00, 9:30, 10:00)

### SMS Notifications & Reminders

Control automatic text message reminders:

- **Enable Reminders:** Turn on/off all automatic reminders
- **Primary Reminder:** Usually sent 24 hours before appointment
- **Secondary Reminder:** Optional second reminder (e.g., 2 hours before)

**Note:** SMS reminders require Twilio credentials to be configured (see "What Still Requires Setup" below).

### Test Mode

**IMPORTANT:** Test Mode is for safely testing the booking system without bothering real clients or processing real payments.

**When Test Mode is ON:**
- All new bookings are marked as "TEST" (you'll see a yellow badge)
- NO real text messages are sent (they're logged but not actually delivered)
- NO real payments are processed (even if Stripe is configured)
- The client booking site shows a warning: "Test Mode - for testing only"

**When to use Test Mode:**
1. You're trying out the system for the first time
2. Training new staff on how bookings work
3. Making sure everything looks correct before going live

**After testing:** Go to Settings > Test Mode > "Delete Test Bookings" to clean up all test appointments.

**WARNING:** Always turn Test Mode OFF before real clients start using the system!

### Online Payments & Tips

Your system has support for online payments and tip presets, but this requires connecting to Stripe (a payment processor).

- **Tip Presets:** You can set percentage tips (like 15%, 18%, 20%) and flat-dollar tips (like $5, $10)
- **Until Stripe is configured:** All clients pay at the shop (cash or card in person)

**Español:**

Ve a "Configuración" en el menú principal para controlar cómo opera tu tienda.

### Reglas de Reserva

Estas controlan qué tan adelantado pueden reservar los clientes:

- **Días Reservables por Adelantado:** Cuántos días adelante pueden reservar los clientes (ej: 30 significa que pueden reservar hasta 30 días desde hoy)
- **Aviso Mínimo en Horas:** Cuánto tiempo de aviso necesitas (ej: 2 significa que los clientes deben reservar al menos 2 horas antes de la cita)
- **Horas Mínimas para Cancelar:** Cuánto aviso deben dar los clientes para cancelar (ej: 4 significa que deben cancelar al menos 4 horas antes)
- **Intervalo de Reserva:** Franjas horarias que ven los clientes (ej: 30 significa que pueden reservar cada 30 minutos como 9:00, 9:30, 10:00)

### Notificaciones SMS y Recordatorios

Controla recordatorios automáticos por mensaje de texto:

- **Habilitar Recordatorios:** Activar/desactivar todos los recordatorios automáticos
- **Recordatorio Primario:** Usualmente enviado 24 horas antes de la cita
- **Recordatorio Secundario:** Segundo recordatorio opcional (ej: 2 horas antes)

**Nota:** Los recordatorios SMS requieren que se configuren credenciales de Twilio (ver "Lo Que Aún Requiere Configuración" abajo).

### Modo de Prueba

**IMPORTANTE:** El Modo de Prueba es para probar el sistema de reservas de manera segura sin molestar a clientes reales o procesar pagos reales.

**Cuando el Modo de Prueba está ACTIVADO:**
- Todas las nuevas reservas se marcan como "TEST" (verás una etiqueta amarilla)
- NO se envían mensajes de texto reales (se registran pero no se entregan realmente)
- NO se procesan pagos reales (incluso si Stripe está configurado)
- El sitio de reservas del cliente muestra una advertencia: "Modo de Prueba - solo para pruebas"

**Cuándo usar el Modo de Prueba:**
1. Estás probando el sistema por primera vez
2. Entrenando nuevo personal sobre cómo funcionan las reservas
3. Asegurándote de que todo se vea correcto antes de lanzar

**Después de probar:** Ve a Configuración > Modo de Prueba > "Eliminar Reservas de Prueba" para limpiar todas las citas de prueba.

**ADVERTENCIA:** ¡Siempre desactiva el Modo de Prueba antes de que los clientes reales comiencen a usar el sistema!

### Pagos en Línea y Propinas

Tu sistema tiene soporte para pagos en línea y preajustes de propinas, pero esto requiere conectarse a Stripe (un procesador de pagos).

- **Preajustes de Propinas:** Puedes establecer propinas porcentuales (como 15%, 18%, 20%) y propinas fijas en dólares (como $5, $10)
- **Hasta que Stripe esté configurado:** Todos los clientes pagan en la tienda (efectivo o tarjeta en persona)

---

## Services & Products

**English:**

### Services

Services are what you offer (haircut, beard trim, etc.).

**To add a service:**
1. Go to "Services"
2. Click "Add Service"
3. Fill in:
   - **Name (English):** Service name in English
   - **Name (Spanish):** Service name in Spanish (clients will see their language)
   - **Base Price:** Standard price in dollars
   - **Duration:** How long it takes (in minutes)
   - **Image:** Upload a photo showing this service (optional but recommended)

**Image tips:**
- Use clear, professional photos
- Maximum file size: 100MB
- Recommended formats: JPG, PNG, WebP
- If no image is uploaded, the service still works fine (shows a placeholder)

### Products

Products are items you sell (pomade, shampoo, etc.).

**To add a product:**
1. Go to "Products"
2. Click "Add Product"
3. Fill in similar fields as services
4. Optionally track inventory (stock count)

**Español:**

### Servicios

Los servicios son lo que ofreces (corte de cabello, recorte de barba, etc.).

**Para agregar un servicio:**
1. Ve a "Servicios"
2. Haz clic en "Agregar Servicio"
3. Completa:
   - **Nombre (Inglés):** Nombre del servicio en inglés
   - **Nombre (Español):** Nombre del servicio en español (los clientes verán su idioma)
   - **Precio Base:** Precio estándar en dólares
   - **Duración:** Cuánto tiempo toma (en minutos)
   - **Imagen:** Sube una foto mostrando este servicio (opcional pero recomendado)

**Consejos de imagen:**
- Usa fotos claras y profesionales
- Tamaño máximo de archivo: 100MB
- Formatos recomendados: JPG, PNG, WebP
- Si no se sube ninguna imagen, el servicio aún funciona bien (muestra un marcador de posición)

### Productos

Los productos son artículos que vendes (pomada, champú, etc.).

**Para agregar un producto:**
1. Ve a "Productos"
2. Haz clic en "Agregar Producto"
3. Completa campos similares a los servicios
4. Opcionalmente rastrea el inventario (cantidad en stock)

---

## Appointments

**English:**

### Viewing Appointments

- **Today:** Shows all appointments for today with quick stats (count, revenue)
- **Calendar:** Monthly view of all appointments
- **Appointments List:** All upcoming and past appointments with filters

### The TEST Badge

If you see a yellow **TEST** badge next to an appointment, it means:
- This booking was made while Test Mode was ON
- It's not a real client appointment
- You can safely delete it using "Delete Test Bookings" in Settings

### Cancellations & Rescheduling

**Client-initiated:**
- Clients can cancel or reschedule their own appointments through the booking site
- They must respect the minimum cancellation notice you set in Settings
- They'll receive a confirmation SMS (if SMS is configured)

**Staff-initiated:**
- You or your barbers can cancel/reschedule any appointment
- Click on the appointment to see details, then use the Cancel or Reschedule buttons
- You can add notes explaining why (optional)

**Español:**

### Ver Citas

- **Hoy:** Muestra todas las citas de hoy con estadísticas rápidas (cantidad, ingresos)
- **Calendario:** Vista mensual de todas las citas
- **Lista de Citas:** Todas las citas futuras y pasadas con filtros

### La Etiqueta TEST

Si ves una etiqueta amarilla **TEST** junto a una cita, significa:
- Esta reserva se hizo mientras el Modo de Prueba estaba ACTIVADO
- No es una cita de cliente real
- Puedes eliminarla de forma segura usando "Eliminar Reservas de Prueba" en Configuración

### Cancelaciones y Reprogramación

**Iniciadas por el cliente:**
- Los clientes pueden cancelar o reprogramar sus propias citas a través del sitio de reservas
- Deben respetar el aviso mínimo de cancelación que estableciste en Configuración
- Recibirán un SMS de confirmación (si SMS está configurado)

**Iniciadas por el personal:**
- Tú o tus barberos pueden cancelar/reprogramar cualquier cita
- Haz clic en la cita para ver detalles, luego usa los botones Cancelar o Reprogramar
- Puedes agregar notas explicando por qué (opcional)

---

## Time Tracking & Commissions

**English:**

### Barber Time Tracking

Your barbers can clock in and out for their shifts:

1. **Clock In:** When they start their shift
2. **Break Start/End:** When they take breaks (lunch, etc.)
3. **Clock Out:** When they finish their shift

This helps you track hours worked and calculate accurate pay and commissions.

### Owner View

As the owner, go to "Barbers > Time Tracking" to see:
- All time entries for the current pay period
- Total hours worked by each barber
- Overtime hours (if applicable)
- Export to CSV for payroll

### Commission Tracking

Each completed appointment automatically tracks:
- Service total
- Commission owed to the barber (based on their commission rate)
- Payment status

You can view commission reports by barber and date range.

**Español:**

### Seguimiento de Tiempo del Barbero

Tus barberos pueden marcar entrada y salida para sus turnos:

1. **Marcar Entrada:** Cuando comienzan su turno
2. **Inicio/Fin de Descanso:** Cuando toman descansos (almuerzo, etc.)
3. **Marcar Salida:** Cuando terminan su turno

Esto te ayuda a rastrear horas trabajadas y calcular el pago y las comisiones de manera precisa.

### Vista del Propietario

Como propietario, ve a "Barberos > Seguimiento de Tiempo" para ver:
- Todas las entradas de tiempo para el período de pago actual
- Total de horas trabajadas por cada barbero
- Horas extras (si aplica)
- Exportar a CSV para nómina

### Seguimiento de Comisiones

Cada cita completada rastrea automáticamente:
- Total del servicio
- Comisión debida al barbero (basada en su tasa de comisión)
- Estado del pago

Puedes ver informes de comisiones por barbero y rango de fechas.

---

## Test Mode & Test Data Cleanup

**English:**

### Testing Your System Safely

Before your shop goes live with real clients, you should test the booking flow:

1. **Enable Test Mode:**
   - Go to Settings > Test Mode
   - Check the box "Enable Test Mode"
   - Click "Save Changes"

2. **Create Test Bookings:**
   - Open your client booking site
   - You'll see a yellow warning: "Test Mode Enabled"
   - Make a few test appointments using fake phone numbers
   - All bookings will be marked with a **TEST** badge

3. **Verify Everything Works:**
   - Check that appointments appear in your calendar
   - Verify barber availability is respected
   - Try canceling and rescheduling test appointments

4. **Clean Up Test Data:**
   - Go back to Settings > Test Mode
   - Scroll to "Test Data Tools"
   - Click "Delete Test Bookings"
   - Confirm the deletion
   - All test appointments will be cancelled (not deleted, just marked cancelled)

5. **Go Live:**
   - IMPORTANT: Turn OFF Test Mode before real clients use the system
   - Uncheck "Enable Test Mode" and save

### Why This Matters

- Test Mode prevents embarrassing mistakes (like sending SMS to random numbers)
- It lets you practice without affecting real data
- The "Delete Test Bookings" button ONLY affects test data - your real appointments are safe

**Español:**

### Probar Tu Sistema de Forma Segura

Antes de que tu tienda se lance con clientes reales, debes probar el flujo de reservas:

1. **Habilitar Modo de Prueba:**
   - Ve a Configuración > Modo de Prueba
   - Marca la casilla "Habilitar Modo de Prueba"
   - Haz clic en "Guardar Cambios"

2. **Crear Reservas de Prueba:**
   - Abre tu sitio de reservas para clientes
   - Verás una advertencia amarilla: "Modo de Prueba Activado"
   - Haz algunas citas de prueba usando números de teléfono falsos
   - Todas las reservas se marcarán con una etiqueta **TEST**

3. **Verificar Que Todo Funcione:**
   - Verifica que las citas aparezcan en tu calendario
   - Verifica que se respete la disponibilidad del barbero
   - Intenta cancelar y reprogramar citas de prueba

4. **Limpiar Datos de Prueba:**
   - Vuelve a Configuración > Modo de Prueba
   - Desplázate a "Herramientas de Datos de Prueba"
   - Haz clic en "Eliminar Reservas de Prueba"
   - Confirma la eliminación
   - Todas las citas de prueba se cancelarán (no se eliminan, solo se marcan como canceladas)

5. **Lanzar:**
   - IMPORTANTE: Desactiva el Modo de Prueba antes de que los clientes reales usen el sistema
   - Desmarca "Habilitar Modo de Prueba" y guarda

### Por Qué Esto Importa

- El Modo de Prueba previene errores embarazosos (como enviar SMS a números aleatorios)
- Te permite practicar sin afectar datos reales
- El botón "Eliminar Reservas de Prueba" SOLO afecta datos de prueba - tus citas reales están seguras

---

## What Still Requires Setup

**English:**

Your booking system is fully functional, but to unlock all features, you need to configure:

### 1. SMS Notifications (Twilio)

To send automatic appointment reminders and confirmations, you need:

- A Twilio account (sign up at twilio.com)
- Your Twilio Account SID
- Your Twilio Auth Token
- A Twilio phone number

Add these to your environment variables:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_phone_number
SMS_ENABLED=true
```

Without this, reminders won't be sent (but everything else works fine).

### 2. Online Payments (Stripe)

To let clients pay online with credit cards, you need:

- A Stripe account (sign up at stripe.com)
- Your Stripe Publishable Key
- Your Stripe Secret Key

Add these to your environment variables:
```
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

Without this, all clients pay at the shop (cash or in-person card).

### 3. Automated Reminder Scheduling

Your system has a `send-reminders` function that checks for due reminders and sends them.

You need to set up a cron job (scheduled task) that calls this function every hour or so.

Ask your developer to:
- Set up a cron trigger for the `send-reminders` Edge Function
- Test that reminders are sent at the right time

### Need Help?

Contact your developer with this handbook and the DEV_HANDBOOK.md file. They'll know what to do!

**Español:**

Tu sistema de reservas es completamente funcional, pero para desbloquear todas las características, necesitas configurar:

### 1. Notificaciones SMS (Twilio)

Para enviar recordatorios y confirmaciones automáticas de citas, necesitas:

- Una cuenta de Twilio (regístrate en twilio.com)
- Tu Twilio Account SID
- Tu Twilio Auth Token
- Un número de teléfono de Twilio

Agrega estos a tus variables de entorno:
```
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_FROM_NUMBER=tu_numero_telefono
SMS_ENABLED=true
```

Sin esto, los recordatorios no se enviarán (pero todo lo demás funciona bien).

### 2. Pagos en Línea (Stripe)

Para permitir que los clientes paguen en línea con tarjetas de crédito, necesitas:

- Una cuenta de Stripe (regístrate en stripe.com)
- Tu Stripe Publishable Key
- Tu Stripe Secret Key

Agrega estos a tus variables de entorno:
```
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

Sin esto, todos los clientes pagan en la tienda (efectivo o tarjeta en persona).

### 3. Programación Automática de Recordatorios

Tu sistema tiene una función `send-reminders` que verifica recordatorios pendientes y los envía.

Necesitas configurar un cron job (tarea programada) que llame a esta función cada hora aproximadamente.

Pide a tu desarrollador que:
- Configure un disparador cron para la función Edge `send-reminders`
- Pruebe que los recordatorios se envían en el momento correcto

### ¿Necesitas Ayuda?

¡Contacta a tu desarrollador con este manual y el archivo DEV_HANDBOOK.md. ¡Ellos sabrán qué hacer!

---

**End of Owner Handbook / Fin del Manual del Propietario**
