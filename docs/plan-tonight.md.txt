SECTION 1 – TONIGHT’S BUILD PLAN (PRE-CONTRACT PWA, READY BY 7:00 PM)

1.0 OVERALL GOAL FOR TONIGHT
By tomorrow at 7:00 PM, you and your brother will have a working PWA that:
Lets Owner (Lupe) and barbers:


Log in with their own accounts.


View and manage today’s schedule.


Manually create, complete, and no-show appointments (with permissions).


Offers clients a bilingual booking flow (/book) that:


Respects shop hours, barber schedules, and time-off.


Books appointments in the system as unpaid (cash due in shop).


Has:


Products module (for sales + services add-ons).


Transformation photos per completed appointment.


Role-based permissions (owner controls what each barber sees/does).


Analytics including:


Services revenue.


Products revenue.


Tips.


Net revenue (card fee fields reserved but effectively 0 for now).


Per-barber breakdown.


Ratings.


Is a proper PWA:


Installable on Android (Add to Home Screen / Install App).


Has an iOS guide banner (“Add to Home Screen” instructions).


Is backend-ready for a future voice agent (clean APIs + DB fields) but:


No voice UI, no mention of “voice” or “AI receptionist” anywhere.


This section is your checklist for tonight + which AI coder/tool to use at each phase.

1.1 TOOL STRATEGY & WORKFLOW FOR TONIGHT
Central repo:
Create a GitHub repo: lupes-barber-pwa.


AI tools and how to use them:
bolt.new
 Use for big “scaffold and extend” phases:


Phase 1 – Core app + basic /book + basic schema.


Phase 4 – Products & transformation photos.


Phase 5 – Role-based permissions.


Phase 6 – Analytics.


Phase 7 – Voice-ready backend APIs.


Replit
 Use for:


Running the app and testing in browser.


Adjusting layout/UI text.


Smaller code tweaks and bug fixes.


Gemini Antigravity
 Use as a helper for:


Generating individual components (cards, tables, forms).


Refactoring pieces of code you paste in.


Workflow pattern for each phase:
Update repo with bolt.new (or Antigravity) based on that phase’s prompt.


Pull changes into Replit → run the app, test flows.


Fix UI/behavior issues with Replit’s AI or manual edits.


Move to next phase.



1.2 DATA MODEL TO IMPLEMENT TONIGHT
These tables/collections must exist tonight.
1.2.1 Users
id


name


phone


email


role: "OWNER" | "BARBER"


language: "en" | "es"


active: boolean


Permission flags:


can_view_shop_reports


can_view_own_stats


can_manage_services


can_manage_products


can_manage_barbers


can_manage_schedules


created_at, updated_at


1.2.2 Clients
id


first_name


last_name


phone


email


language: "en" | "es"


created_at, updated_at


1.2.3 Services
id


name_en


name_es


description_en (optional)


description_es (optional)


base_price


duration_minutes


active


1.2.4 Products
id


name_en


name_es


description_en / description_es (optional)


price


active


created_at, updated_at


1.2.5 Appointments
id


client_id


barber_id


service_id


scheduled_start


scheduled_end


status: "booked" | "completed" | "no_show" | "cancelled"


channel: "online_pwa" | "internal_manual" | "voice_agent"


 Tonight’s UI only uses "online_pwa" and "internal_manual". "voice_agent" is for the future voice integration (invisible in UI).



Money fields:


services_total


products_total


tax_amount (can be 0 tonight)


tip_amount


card_fee_amount (0 for now)


total_charged


net_revenue


Payment:


payment_method: "cash" | null (card methods later)


paid_at


Ratings:


rating (1–5, nullable)


review_comment (optional)


created_at, updated_at, completed_at


1.2.6 TransformationPhoto
id


appointment_id


barber_id


client_id


image_url


type: "before" | "after" | "single" (optional)


notes (optional)


created_at


1.2.7 BarberSchedule
id


barber_id


day_of_week (0–6)


start_time (e.g. "10:00")


end_time (e.g. "19:00")


active


1.2.8 BarberTimeOff
id


barber_id


date


start_time (optional)


end_time (optional)


reason (optional)


1.2.9 Settings / ShopConfig
id


shop_name


address


phone


default_staff_language


default_client_language


shop_hours (per weekday)


tax_rate (can be 0 for now)


card_fee_rate (configurable, used later)


google_review_link (optional)


google_maps_link (optional)


voice_agent_enabled (boolean, default false)


voice_api_key (nullable string, for future use)


1.2.10 CallLog (Voice-Ready, Invisible Tonight)
id


external_call_id


direction: "inbound" | "outbound"


from_number


to_number


language: "en" | "es"


status: "in_progress" | "completed" | "failed"


outcome: "booked" | "info_only" | "hung_up" | "failed_transfer" (nullable)


appointment_id (nullable)


created_at, updated_at


No UI for CallLog tonight. It’s just there for future voice integration.

1.3 PHASE 0 – SETUP REPO & TOOLS
Objective: Get everything connected so AI coders can work.
Steps:
Create GitHub repo: lupes-barber-pwa.


Connect bolt.new to this repo.


Connect Replit to this repo.


Keep a simple readme with: stack, goals, and tonight’s phase list.



1.4 PHASE 1 – CORE SCAFFOLD + BASIC /book (bolt.new)
Objective:
 Get a working React PWA with auth, basic routing, core tables, Owner/Barber dashboards, and a simple bilingual /book that creates appointments.
Tool:
 bolt.new (first big prompt).
Scope:
Tech:


React SPA with TypeScript if possible.


Supabase or Firebase for auth + DB.


Routes:


/login


/owner/today


/owner/appointments


/owner/clients


/owner/barbers


/owner/services


/barber/today


/book


Auth:


Seed 1 OWNER (Lupe).


Seed 2 BARBER users.


Redirect based on role after login.


Owner Today:


Summary cards: appointments today, expected services revenue.


Table of today’s appointments.


“New appointment” modal to create internal manual bookings.


Barber Today:


List of today’s appointments for that barber.


Buttons to mark complete / no-show (basic).


/book:


Choose service → date & time → client info → confirm.


Creates client + appointment (channel = "online_pwa", status = "booked").


Bilingual:


Global language state (en / es).


Main labels in both languages.


Basic manifest + service worker (PWA skeleton).


After bolt.new:
Pull into Replit.


Run app and verify:


Logins work.


Owner and barber dashboards load.


/book creates appointments visible in Owner/Barber views.



1.5 PHASE 2 – REFINED SCHEDULING & AVAILABILITY (bolt.new / Replit)
Objective:
 Enforce shop hours, barber weekly schedules, and time-off for all bookings (manual + /book).
Tools:
 Start with bolt.new (extension prompt), refine in Replit.
Scope:
Settings:


shop_hours per weekday.


Barber schedule:


BarberSchedule table + Owner UI to edit.


Time-off:


BarberTimeOff table + Owner UI to add entries.


Booking rules:


Internal “New appointment” and /book must:


Only allow times within:


Shop open hours.


Barber working hours.


Outside barber time-off.


Not overlapping existing appointments.


For “Any barber” selection:


System picks first available barber meeting rules.



1.6 PHASE 3 – INTERNAL FLOWS & CASH PAYMENT (Replit + AI)
Objective:
 Make Owner/Barber flows clean with manual booking, completion, no-show, and cash payment with tips, plus “Card – Coming soon” stub.
Tools:
 Mostly Replit (with its AI) to refine components and modals.
Scope:
Owner Today:


Summary cards:


Appointments today.


Services revenue today.


Products revenue today (0 for now).


Tips today.


Net revenue today.


Owner Appointment Detail:


Payment section:


Radio buttons:


Cash (enabled).


Card (coming soon) – disabled, with text:


EN: “Online card payments coming soon.”


ES: “Pagos con tarjeta en línea muy pronto.”


If Cash:


Input tip.


Calculate:


subtotal = services_total + products_total


tax_amount (0 or simple rate).


total_charged = subtotal + tax + tip


card_fee_amount = 0


net_revenue = total_charged


Set payment_method = "cash", completed_at, paid_at.


Barber Today:


For now, allow barbers to:


Set status to completed / no-show.


If owner wants: let some barbers also record cash payments (controlled by future permission).



1.7 PHASE 4 – PRODUCTS & TRANSFORMATION PHOTOS (bolt.new)
Objective:
 Add product sales tracking and transformation photo uploads on completed appointments.
Tool:
 bolt.new (extension prompt), then test in Replit.
Scope:
Products:


Products table.


/owner/products page:


List, add, edit products (EN/ES names, price, active).


Appointment detail:


“Products used/sold” section:


Select one or more products.


Auto-calculate products_total.


Recalculate total_charged and net_revenue if already paid.


Transformation Photos:


TransformationPhoto table.


In completed appointments:


“Add transformation photo” button.


Upload images to storage → store URLs.


Client profile:


“Transformations” gallery.


(Optional) Barber view:


Gallery of this barber’s transformation photos.



1.8 PHASE 5 – ROLE-BASED PERMISSIONS (bolt.new / Replit)
Objective:
 Give the owner full control over which barbers see what.
Tool:
 bolt.new to add fields + screens, Replit to tidy UI.
Scope:
Users table:


Add permission flags (already listed in data model).


Owner → Barber Detail:


“Permissions” section with checkboxes:


Can view shop reports?


Can view own stats?


Can manage services?


Can manage products?


Can manage barbers?


Can manage schedules?


UI enforcement:


Hide/show nav items and pages based on permissions.


Backend:


Simple checks to block access to protected endpoints if permission is missing.



1.9 PHASE 6 – ANALYTICS / REPORTS (bolt.new)
Objective:
 Show Lupe real numbers: services, products, tips, net revenue, and per-barber breakdown, plus ratings.
Tool:
 bolt.new for initial implementation, Replit to tweak layout.
Scope:
/owner/reports:


Visible only to OWNER or can_view_shop_reports.


Filters:


Date range (default: this month).


Summary cards:


Total appointments.


Completed appointments.


Services revenue (sum services_total).


Products revenue (sum products_total).


Tips (sum tip_amount).


Net revenue (sum net_revenue).


Average rating.


Per-barber table:


Barber name.


Completed appointments.


Services revenue.


Products revenue.


Tips.


Net revenue.


Average rating.



1.10 PHASE 7 – VOICE-READY BACKEND (INVISIBLE) (bolt.new)
Objective:
 Quietly prepare backend for future voice agent integration. No UI changes.
Tool:
 bolt.new (backend-oriented prompt).
Scope:
Ensure channel field includes "voice_agent".


CallLog table created.


Settings includes:


voice_agent_enabled and voice_api_key.


Add backend-only routes:


POST /api/integrations/availability (check slots).


POST /api/integrations/appointments (create appointment with channel = "voice_agent").


POST /api/integrations/clients/lookup (find client by phone).


All /api/integrations/* endpoints require an x-api-key header.


No navigation, no UI components – purely backend.



1.11 PHASE 8 – PWA INSTALL UX (ANDROID + iOS) (Replit)
Objective:
 Show a real PWA install experience tonight for Android + an iOS guide banner.
Tool:
 Replit (manual + AI tweaks).
Scope:
manifest.json:


name, short_name, start_url, display: "standalone", theme_color, generic icons (192x192, 512x512).


Service worker:


Register on load.


Simple install/activate events.


Android:


Listen for beforeinstallprompt.


Show “Install app” button when available.


Button triggers prompt() and installation.


iOS:


Detect iOS Safari via UserAgent.


Show dismissible banner when logged in:


EN + ES instructions for “Add to Home Screen”.


Store a flag in localStorage so once the user dismisses it, it doesn’t keep popping up.



1.12 PHASE 9 – POLISH, DEMO DATA & FINAL TESTS (Replit)
Objective:
 Make everything demo-ready.
Scope:
Seed demo data:


2–3 barbers.


5–10 clients.


Several services, products.


A set of appointments (some completed, some booked).


Make sure:


Owner flow works end-to-end.


Barber flow works end-to-end.


/book works and respects availability.


Analytics page shows non-zero numbers.


Test PWA install on:


Android.


iOS (with guide)
