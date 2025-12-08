# Domain-Based Routing System

## Overview

The application now uses hostname-based routing to separate the client-facing website from the admin panel. This provides a cleaner, more professional experience for both customers and staff.

## Domain Configuration

### Environment Variables

Two new environment variables control the routing behavior:

```env
VITE_CLIENT_URL=https://lupesbarbershop.com
VITE_ADMIN_URL=https://admin.lupesbarbershop.com
```

### Domain Purposes

1. **Client Domain** (`lupesbarbershop.com`)
   - Public-facing barbershop website
   - Online booking interface
   - Service and barber information
   - Product catalog
   - Client appointment management

2. **Admin Domain** (`admin.lupesbarbershop.com`)
   - Owner dashboard and controls
   - Barber/staff portal
   - Authentication and login
   - Business management tools

## Routing Rules

### Client Domain Behavior

When accessing `lupesbarbershop.com`:

1. **Root URL** (`/`) → Redirects to `/client/home`
2. **All `/client/*` routes** → Work normally (home, services, barbers, products, book, appointments)
3. **Admin routes attempts** (`/login`, `/owner/*`, `/barber/*`) → Automatically redirect to `admin.lupesbarbershop.com/[route]`

### Admin Domain Behavior

When accessing `admin.lupesbarbershop.com`:

1. **Root URL** (`/`) →
   - If authenticated: Redirect to role-appropriate dashboard (`/owner/today` or `/barber/today`)
   - If not authenticated: Redirect to `/login`
2. **All admin routes** → Work normally (login, owner pages, barber pages)
3. **Client routes** → Still accessible (for convenience)

### Development Environment

For `localhost` and `127.0.0.1`:
- Behaves as **admin domain**
- All routes accessible
- No automatic redirects (for easier development and testing)

## Technical Implementation

### Key Components

1. **Hostname Detection**
   ```typescript
   const isAdminDomain = () => {
     const hostname = window.location.hostname;
     return hostname.startsWith('admin.') || hostname === 'localhost' || hostname === '127.0.0.1';
   };
   ```

2. **AdminRouteGuard Component**
   - Wraps all admin routes (`/login`, `/owner/*`, `/barber/*`)
   - Detects if accessed from client domain
   - Performs full-page redirect to admin domain if needed
   - Shows loading spinner during redirect

3. **Root Route Logic**
   - Client domain: Always goes to `/client/home`
   - Admin domain: Authenticated users → dashboard, guests → login

## Route Categories

### Always Accessible on Both Domains
- `/client/*` - All client-facing pages
- `/book` - Legacy booking route (backwards compatibility)

### Admin Domain Only (Auto-Redirect if Accessed from Client Domain)
- `/login` - Authentication
- `/owner/*` - Owner dashboard and management
- `/barber/*` - Barber portal and tools

## Examples

### User Journey: Customer Booking

1. Customer visits `lupesbarbershop.com`
2. Lands on `/client/home` (shop homepage)
3. Clicks "Book Appointment"
4. Goes to `/client/book`
5. Completes booking flow
6. Never sees admin interface

### User Journey: Owner Login

1. Owner visits `lupesbarbershop.com/login`
2. System detects admin route on client domain
3. Automatically redirects to `admin.lupesbarbershop.com/login`
4. Owner logs in
5. Redirected to `admin.lupesbarbershop.com/owner/today`

### User Journey: Direct Admin Access

1. Staff member visits `admin.lupesbarbershop.com`
2. Not authenticated, redirected to `/login`
3. Logs in successfully
4. Redirected to appropriate dashboard based on role

## Benefits

1. **Clear Separation**: Customers never accidentally encounter admin interfaces
2. **Professional URLs**: Client site has clean, simple domain
3. **Better SEO**: Client pages served from main domain
4. **Security**: Admin panel isolated on separate subdomain
5. **Flexibility**: Both portals can be styled/branded differently
6. **Scalability**: Easy to add different subdomains for other purposes (e.g., `booking.lupesbarbershop.com`)

## DNS Configuration Required

To enable this system in production, configure DNS with:

```
A     lupesbarbershop.com          → [Your Server IP]
A     admin.lupesbarbershop.com    → [Your Server IP]
```

Both domains should point to the same deployment, as the routing logic is handled client-side in the React application.

## Testing Locally

During development on `localhost`, the application behaves as the admin domain:
- Access admin routes directly
- Use `/client/*` routes to preview client experience
- To test client domain behavior, use browser dev tools to modify `window.location.hostname` or deploy to staging domains
