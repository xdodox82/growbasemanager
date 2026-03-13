# GrowBase Application - Complete Technical Report

**Generated**: March 13, 2026
**Version**: 2.0
**Application**: Microgreens Farm Management System
**Tech Stack**: React 18, TypeScript 5.8, Vite 5.4, Supabase (PostgreSQL + Auth)
**Primary Language**: Slovak (SK)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Complete File Structure](#complete-file-structure)
3. [All Pages Analysis](#all-pages-analysis)
4. [All Components Analysis](#all-components-analysis)
5. [All Hooks Analysis](#all-hooks-analysis)
6. [Complete Database Schema](#complete-database-schema)
7. [All Supabase Queries](#all-supabase-queries)
8. [Business Logic](#business-logic)
9. [Settings and Configuration](#settings-and-configuration)
10. [User Roles and Permissions](#user-roles-and-permissions)
11. [Integrations](#integrations)
12. [Development Guidelines](#development-guidelines)

---

## Executive Summary

**GrowBase** is a comprehensive microgreens farm management system designed for Slovak microgreens farmers. It manages the entire lifecycle from seed inventory through planting, growing, harvesting, packing, and delivery. The application supports multi-tenant architecture, recurring orders, complex pricing structures, cost tracking, and mobile-optimized workflows.

### Key Capabilities:
- **Order Management**: Single, weekly, and biweekly recurring orders with customer-specific pricing
- **Production Planning**: Auto-generate planting plans based on orders with capacity forecasting
- **Inventory Management**: Seeds, packaging, substrate, labels, and consumables tracking
- **Delivery Optimization**: Route-based delivery with automatic fee calculation
- **Cost Tracking**: Fuel, electricity, water, car service, and other operational costs
- **Multi-language**: Slovak, Czech, English, German support
- **Mobile-First**: Responsive design with pull-to-refresh and touch-optimized UI
- **Security**: Row-level security (RLS), 2FA authentication, role-based access control

---

## Complete File Structure

### Root Directory Files
```
/
├── .env                              # Environment variables (Supabase credentials)
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
├── package.json                      # NPM dependencies and scripts
├── package-lock.json                 # Locked dependency versions
├── tsconfig.json                     # TypeScript main config
├── tsconfig.app.json                 # TypeScript app config
├── tsconfig.node.json                # TypeScript Node config
├── vite.config.ts                    # Vite bundler configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── postcss.config.js                 # PostCSS configuration
├── eslint.config.js                  # ESLint linting rules
├── components.json                   # Shadcn/ui components config
├── vercel.json                       # Vercel deployment config
├── index.html                        # HTML entry point
├── README.md                         # Project README
├── KNOWN_ISSUES.md                   # Known bugs and issues
├── CLOUDFLARE_DEPLOYMENT.md          # Cloudflare deployment guide
├── FIX-DELIVERY-README.md            # Delivery bug fixes documentation
├── SOAKING_REMINDERS_GUIDE.md        # Soaking reminders feature guide
├── SOAKING_REMINDERS_QUICKSTART.md   # Quick start for soaking reminders
└── GROWBASE_REPORT.md                # This technical report
```

### Migration and Data Scripts
```
/
├── full-migration.js                 # Full data migration script
├── migrate-data.js                   # Database migration utility
├── migration-inserts.sql             # Migration SQL inserts
├── check-old-data.js                 # Old data validation
├── check-new-data.js                 # New data validation
├── fix-delivery-prices.js            # Fix delivery pricing issues
├── create-packaging-function.js      # Create packaging RPC function
├── seed-data.sql                     # Sample seed data
├── sample-orders.sql                 # Sample orders
├── sample-orders-complete.sql        # Complete order samples
├── FULL_DATABASE_EXPORT.sql          # Full database export
├── FINAL_PRODUCTION_DATABASE.sql     # Production database snapshot
└── MASTER_FIX.sql                    # Master fix script
```

### Source Files (`src/`)
```
src/
├── main.tsx                          # React app entry point
├── App.tsx                           # Main app component with routing
├── App.css                           # Global app styles
├── index.css                         # Global CSS with Tailwind imports
├── vite-env.d.ts                     # Vite environment types
├── types/
│   └── index.ts                      # All TypeScript interfaces/types
├── hooks/                            # Custom React hooks (12 files)
│   ├── useAuth.tsx                   # Authentication hook
│   ├── useSupabaseData.tsx           # Centralized data fetching
│   ├── usePrices.tsx                 # Pricing management
│   ├── useDeliveryDays.tsx           # Delivery days management
│   ├── useHarvestDays.ts             # Harvest calculation
│   ├── useVATSettings.tsx            # VAT settings
│   ├── usePackagingMappings.tsx      # Packaging weight mappings
│   ├── useWorkerPermissions.tsx      # Worker permissions
│   ├── useInventoryConsumption.tsx   # Inventory consumption tracking
│   ├── use-mobile.tsx                # Mobile detection hook
│   ├── usePullToRefresh.tsx          # Pull-to-refresh gesture
│   └── use-toast.ts                  # Toast notifications
├── pages/                            # All page components (43 files)
│   ├── Index.tsx                     # Landing/redirect page
│   ├── Dashboard.tsx                 # Main dashboard
│   ├── TodayTasksPage.tsx            # Today's tasks view
│   ├── AuthPage.tsx                  # Login/signup page
│   ├── NotFound.tsx                  # 404 page
│   ├── CropsPage.tsx                 # Crops management
│   ├── CustomersPage.tsx             # Customers management
│   ├── SuppliersPage.tsx             # Suppliers management
│   ├── OrdersPage.tsx                # Orders management (main)
│   ├── PlantingPlanPage.tsx          # Planting plan management
│   ├── PlantingManagement.tsx        # Planting overview
│   ├── BlendsPage.tsx                # Crop blends management
│   ├── CalendarPage.tsx              # Calendar view
│   ├── DeliveryPage.tsx              # Delivery routes and planning
│   ├── HarvestPackingPage.tsx        # Harvest and packing workflow
│   ├── PrepPlantingPage.tsx          # Planting preparation
│   ├── PrepPackagingPage.tsx         # Packaging preparation
│   ├── PricesPage.tsx                # Price management
│   ├── UsersPage.tsx                 # User management (admin)
│   ├── SettingsPage.tsx              # System settings
│   ├── ReportsPage.tsx               # Reports and analytics
│   ├── SeedsPage.tsx                 # Seed inventory
│   ├── PackagingPage.tsx             # Packaging inventory
│   ├── SubstratePage.tsx             # Substrate inventory
│   ├── LabelsPage.tsx                # Label inventory
│   ├── ConsumableInventoryPage.tsx   # Consumable items
│   ├── OtherInventoryPage.tsx        # Other inventory items
│   ├── FuelCostsPage.tsx             # Fuel cost tracking
│   ├── AdblueCostsPage.tsx           # AdBlue cost tracking
│   ├── ElectricityCostsPage.tsx      # Electricity cost tracking
│   ├── WaterCostsPage.tsx            # Water cost tracking
│   ├── CarServiceCostsPage.tsx       # Car service cost tracking
│   ├── OtherCostsPage.tsx            # Other costs tracking
│   └── [*.BACKUP.tsx, *.BACKUP2.tsx] # Backup versions (20 files)
├── components/
│   ├── layout/                       # Layout components (5 files)
│   │   ├── MainLayout.tsx            # Main app wrapper with sidebar
│   │   ├── Sidebar.tsx               # Desktop navigation sidebar
│   │   ├── MobileSidebar.tsx         # Mobile navigation drawer
│   │   ├── DesktopHeader.tsx         # Desktop header bar
│   │   └── MobileHeader.tsx          # Mobile header with hamburger
│   ├── ui/                           # Shadcn/ui components (60+ files)
│   │   ├── button.tsx                # Button component
│   │   ├── input.tsx                 # Text input
│   │   ├── select.tsx                # Dropdown select
│   │   ├── checkbox.tsx              # Checkbox
│   │   ├── switch.tsx                # Toggle switch
│   │   ├── dialog.tsx                # Modal dialog
│   │   ├── sheet.tsx                 # Side sheet/drawer
│   │   ├── table.tsx                 # Table component
│   │   ├── card.tsx                  # Card container
│   │   ├── badge.tsx                 # Badge/tag
│   │   ├── alert.tsx                 # Alert message
│   │   ├── toast.tsx                 # Toast notification
│   │   ├── calendar.tsx              # Date picker calendar
│   │   ├── tabs.tsx                  # Tabbed interface
│   │   ├── accordion.tsx             # Collapsible accordion
│   │   ├── dropdown-menu.tsx         # Dropdown menu
│   │   ├── popover.tsx               # Popover tooltip
│   │   ├── tooltip.tsx               # Simple tooltip
│   │   ├── progress.tsx              # Progress bar
│   │   ├── slider.tsx                # Range slider
│   │   ├── separator.tsx             # Visual divider
│   │   ├── skeleton.tsx              # Loading skeleton
│   │   ├── mobile-table.tsx          # Mobile-responsive table
│   │   ├── view-toggle.tsx           # Grid/List/Table view switcher
│   │   ├── status-select.tsx         # Order status selector
│   │   ├── planting-status-select.tsx # Planting status selector
│   │   ├── pull-to-refresh.tsx       # Pull-to-refresh component
│   │   ├── page-components.tsx       # Reusable page components
│   │   └── [55+ more UI components]  # Complete Shadcn library
│   ├── orders/                       # Order-specific components (6 files)
│   │   ├── SearchableCustomerSelect.tsx     # Searchable customer dropdown
│   │   ├── CategoryFilter.tsx               # Order category filter
│   │   ├── OrderSearchBar.tsx               # Text search for orders
│   │   ├── RecurringOrderEditDialog.tsx     # Edit recurring orders
│   │   ├── RecurringOrderDeleteDialog.tsx   # Delete recurring orders
│   │   └── RecurringOrderExtendDialog.tsx   # Extend recurring orders
│   ├── delivery/                     # Delivery components (3 files)
│   │   ├── RouteManagement.tsx       # Delivery route CRUD
│   │   ├── DeliveryDaysSettings.tsx  # Configure delivery days
│   │   └── DeliveryDaysCompact.tsx   # Compact delivery days display
│   ├── dashboard/                    # Dashboard widgets (6 files)
│   │   ├── index.ts                  # Widget exports
│   │   ├── OrdersChart.tsx           # Orders trend chart
│   │   ├── PlantingStats.tsx         # Planting statistics
│   │   ├── LowStockAlerts.tsx        # Low inventory alerts
│   │   ├── SoakingReminders.tsx      # Seed soaking reminders
│   │   └── ProductionOverview.tsx    # Production capacity overview
│   ├── settings/                     # Settings panels (7 files)
│   │   ├── VATSettings.tsx           # VAT configuration
│   │   ├── HarvestSettings.tsx       # Harvest day settings
│   │   ├── DeliverySettings.tsx      # Delivery route settings
│   │   ├── DeliveryDaysSettings.tsx  # Delivery days config
│   │   ├── SidebarManagement.tsx     # Sidebar customization
│   │   └── WorkerPermissionsSettings.tsx # Worker permissions
│   ├── auth/                         # Authentication components (4 files)
│   │   ├── TwoFactorSetup.tsx        # 2FA enrollment
│   │   ├── TwoFactorVerify.tsx       # 2FA verification
│   │   ├── TwoFactorSettings.tsx     # 2FA management
│   │   └── LoginHistory.tsx          # Login history display
│   ├── filters/                      # Filter components (1 file)
│   │   └── CustomerTypeFilter.tsx    # Customer type filter
│   ├── forms/                        # Form components (1 file)
│   │   └── VATInput.tsx              # VAT input with validation
│   ├── mobile/                       # Mobile-specific components (5 files)
│   │   ├── index.ts                  # Mobile exports
│   │   ├── MobileDashboard.tsx       # Mobile dashboard layout
│   │   ├── MobileQuickEntry.tsx      # Quick data entry
│   │   ├── QuickActionFAB.tsx        # Floating action button
│   │   └── MobileBottomNav.tsx       # Bottom navigation bar
│   ├── notifications/                # Notification components (1 file)
│   │   └── NotificationCenter.tsx    # In-app notification center
│   ├── ProtectedRoute.tsx            # Auth-protected route wrapper
│   ├── ErrorBoundary.tsx             # Error boundary component
│   ├── LanguageSelector.tsx          # Language switcher
│   ├── NavLink.tsx                   # Navigation link component
│   ├── DataExportBackup.tsx          # Data export utility
│   ├── DataExportImport.tsx          # Data import/export
│   ├── DataMigrationTool.tsx         # Migration tools
│   └── PackagingMappings.tsx         # Packaging weight mappings
├── i18n/                             # Internationalization (2 files)
│   ├── LanguageContext.tsx           # Language context provider
│   └── translations.ts               # Translation strings (SK/CZ/EN/DE)
├── lib/                              # Utility libraries (1 file)
│   └── utils.ts                      # Utility functions (cn, etc.)
├── integrations/
│   └── supabase/                     # Supabase integration (2 files)
│       ├── client.ts                 # Supabase client initialization
│       └── types.ts                  # Auto-generated database types
└── store/                            # State management (1 file)
    └── appStore.ts                   # Application state store
```

### Database Files (`db/`)
```
db/
├── README.md                         # Database documentation
├── DATA_EXPORT_README.md             # Data export guide
├── RECURRING_ORDERS_BACKFILL_README.md # Recurring orders backfill guide
├── data-export.sql                   # Data export script
├── diagnose-recurring-orders.sql     # Diagnose recurring orders
├── manual-update-template.sql        # Manual update template
├── test-soaking-reminders.sql        # Test soaking reminders
├── verify-recurring-backfill.sql     # Verify backfill results
└── migrations/                       # Supabase migrations (100+ files)
    └── 001_crop_management_schema.sql # Initial schema
```

### Supabase Migrations (`supabase/migrations/`)
```
supabase/migrations/
├── 20251228000122_*.sql              # Initial schema setup
├── 20251228002807_*.sql              # RLS policies
├── 20251228003321_*.sql              # Auth setup
├── 20251228004052_*.sql              # Core tables
├── 20251228081637_*.sql              # Orders table
├── 20251228083553_*.sql              # Order items
├── 20251228092737_*.sql              # Planting plans
├── 20251228100729_*.sql              # Inventory tables
├── 20251228102215_*.sql              # Seeds table
├── 20251228104410_*.sql              # Packaging table
├── 20251228105151_*.sql              # Substrate table
├── 20251228110357_*.sql              # Blends table
├── 20251228143526_*.sql              # Delivery routes
├── 20251228145933_*.sql              # Prices table
├── 20251229233557_*.sql              # Cost tables setup
├── 20251230000725_*.sql              # RPC functions
├── 20251230082459_*.sql              # Triggers
├── 20251230143702_*.sql              # Policies update
├── 20251230153331_*.sql              # Labels table
├── 20251230154404_*.sql              # Other inventory
├── 20251230200843_*.sql              # Consumables
├── 20260103221622_*.sql              # Multi-tenant support
├── 20260103225031_*.sql              # User ID fields
├── 20260103233805_*.sql              # Session replica
├── 20260104132957_*.sql              # Fix user IDs
├── 20260104134827_*.sql              # Import backup data
├── 20260104140217_*.sql              # Delivery routes fix
├── 20260104141142_*.sql              # Default user IDs
├── 20260104141308_*.sql              # Auto user ID population
├── 20260104142358_*.sql              # Planting plans user ID
├── 20260104142431_*.sql              # Triggers for remaining tables
├── 20260104150323_*.sql              # Seed soaking fields
├── 20260104153128_*.sql              # Harvest order field
├── 20260104204215_*.sql              # RLS for admin user creation
├── 20260104224344_*.sql              # Total price fields
├── 20260104225739_*.sql              # Fix recurring orders logic
├── 20260104231647_*.sql              # Complete recurring orders fix
├── 20260105144834_*.sql              # Worker user RPC
├── 20260105145718_*.sql              # Cleanup orphan records
├── 20260105145814_*.sql              # Updated RPC with cleanup
├── 20260105151403_*.sql              # Admin create user v3
├── 20260105153549_*.sql              # Cascade cleanup
├── 20260105153624_*.sql              # Admin delete user RPC
├── 20260105154509_*.sql              # Debug enhancements
├── 20260105155341_*.sql              # Enable pgcrypto
├── 20260105155448_*.sql              # Fix pgcrypto path
├── 20260105155614_*.sql              # Extensions schema
├── 20260105160412_*.sql              # Cleanup orphaned profiles
├── 20260105161130_*.sql              # Public pgcrypto
├── 20260105162005_*.sql              # Handle trigger conflict
├── 20260105162319_*.sql              # Upsert fix
├── 20260105162356_*.sql              # Correct conflict target
├── 20260105174719_*.sql              # Tray management & safety buffer
├── 20260105183455_*.sql              # Count as production field
├── 20260105211539_*.sql              # Sidebar settings
├── 20260105213808_*.sql              # Payment method field
├── 20260105234051_*.sql              # Delivery order field
├── 20260106124147_*.sql              # Finished date for seeds
├── 20260106142213_*.sql              # Create cost tables
├── 20260106144714_*.sql              # Delivery fees & costs
├── 20260106165738_*.sql              # Delivery fees by customer type
├── 20260106165927_*.sql              # Charge delivery field
├── 20260106170854_*.sql              # Substrate fields in plans
├── 20260106174340_*.sql              # Default substrate in crops
├── 20260107213206_*.sql              # Pricing fields in inventory
├── 20260107215656_*.sql              # VAT fields in inventory
├── 20260107220852_*.sql              # Remove unsafe RLS
├── 20260110211224_*.sql              # Price includes VAT field
├── 20260110211310_*.sql              # Delivery settings in profiles
├── 20260110212743_*.sql              # Delivery limits to routes
├── 20260110212838_*.sql              # Delivery fields in orders
├── 20260110214439_*.sql              # Comprehensive worker permissions
├── 20260111155306_*.sql              # Customer/crop names in orders
├── 20260112191900_*.sql              # Packaging in order items
├── 20260112192012_*.sql              # Decrement packaging RPC
├── 20260112210238_*.sql              # Price fields in order items
├── 20260112221634_*.sql              # Route in orders
├── 20260112221710_*.sql              # Crop name in order items
├── 20260113133805_*.sql              # Packaging mappings table
├── 20260114184916_*.sql              # Fix numeric types & special items
├── 20260118155255_*.sql              # Sync orders table with types
├── 20260118155311_*.sql              # Sync seeds table
├── 20260118155325_*.sql              # Sync packagings table
├── 20260118155341_*.sql              # Sync substrates table
├── 20260118155354_*.sql              # Sync order items table
├── 20260118182219_*.sql              # Customer type in orders
├── 20260119194801_*.sql              # Delivery days settings
├── 20260119201920_*.sql              # Global VAT settings v2
├── 20260119210625_*.sql              # VAT in cost tables
├── 20260121225401_*.sql              # Blend ID in packaging mappings
├── 20260121232332_*.sql              # Fix calculate order total price
├── 20260122203353_*.sql              # Packaging type columns
├── 20260124195102_*.sql              # Crop management enhancements v2
├── 20260124205216_*.sql              # Soaking reminders system
├── 20260125113815_*.sql              # Generate planting plan function
├── 20260125115908_*.sql              # Fix generate planting plan
├── 20260126232455_*.sql              # Mixed planting support
├── 20260127193336_*.sql              # Test & notes in planting plans
├── 20260128190244_*.sql              # Create order item RPC
├── 20260128193357_*.sql              # Fix create order item RPC
├── 20260128194607_*.sql              # Order item JSONB bypass
├── 20260128204853_*.sql              # Force schema refresh
├── 20260128210245_*.sql              # Rename order items columns (v2.0)
├── 20260128210302_*.sql              # Update RPC with new names
├── 20260131232902_*.sql              # Create order item with packaging
├── 20260131233334_*.sql              # Fix create order item RPC
├── 20260201110306_*.sql              # Fix package_ml cast
├── 20260202195252_*.sql              # Source orders in planting plans
└── 20260209164658_*.sql              # Backfill recurring order data
```

### Supabase Edge Functions (`supabase/functions/`)
```
supabase/functions/
├── ping/
│   └── index.ts                      # Health check function
├── test-hello/
│   └── index.ts                      # Test hello function
├── track-login/
│   └── index.ts                      # Track login events
├── delete-user/
│   └── index.ts                      # Delete user function
├── migrate-data/
│   └── index.ts                      # Data migration function
└── fix-order-delivery-fees/
    └── index.ts                      # Fix delivery fees function
```

### Public Files (`public/`)
```
public/
├── favicon.ico                       # Favicon
├── placeholder.svg                   # Placeholder image
├── robots.txt                        # SEO robots file
└── _redirects                        # Redirect rules for hosting
```

### Configuration Files (`.idx/`)
```
.idx/
└── dev.nix                           # Nix development environment
```

---

## All Pages Analysis

### 1. Dashboard (`/` - Dashboard.tsx)

**Route**: `/`

**Supabase Tables**:
- **Read**: `products`, `customers`, `orders`, `planting_plans`, `order_items`, `tasks`, `seeds`, `packagings`, `substrates`, `blends`
- **Write**: None (read-only dashboard)

**Key Features**:
1. **Statistics Cards**:
   - Total crops count
   - Active customers count
   - Active orders count (status != 'dorucena', 'zrusena')
   - Trays in growth (planting_plans with status 'growing')

2. **Daily Tasks Generation**:
   - Soaking tasks (seeds needing soaking today)
   - Sowing tasks (planting_plans with sow_date = today, status = 'planned')
   - Weight removal tasks (calculated from sow_date + days_to_germination)
   - Move to light tasks (calculated from sow_date + days_in_darkness)
   - Harvest tasks (expected_harvest_date = today)
   - Delivery tasks (orders with delivery_date = today)

3. **Harvest Capacity Calculator** (7-day forecast):
   - Groups by crop_id + harvest_date + packaging_size
   - Calculates available capacity: SUM(tray_count × expected_yield)
   - Calculates ordered quantity: SUM(order_items.quantity)
   - Shows deficit/surplus per crop/date/size
   - Color codes: red (deficit), yellow (tight), green (surplus)

4. **Upcoming Notifications** (next 3 days):
   - Harvests due (expected_harvest_date within 3 days)
   - Deliveries due (delivery_date within 3 days)

5. **Dashboard Widgets**:
   - `<OrdersChart />` - Order trends over time
   - `<PlantingStats />` - Planting statistics
   - `<LowStockAlerts />` - Low inventory warnings
   - `<SoakingReminders />` - Seed soaking reminders
   - `<ProductionOverview />` - Production capacity overview

**State Managed**:
```typescript
- dailyTasks: Task[] // Generated from planting plans and orders
- upcomingNotifications: Notification[] // Calculated from future events
- harvestCapacity: CapacityItem[] // 7-day capacity forecast
- traysInGrowth: number // Count of active plantings
- activeOrders: Order[] // Orders not delivered/cancelled
- lowStockItems: InventoryItem[] // Items below min_stock
```

**Queries**:
```typescript
// Crops
const { data: crops } = await supabase.from('products').select('*')

// Customers
const { data: customers } = await supabase.from('customers').select('*')

// Active Orders
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*)')
  .neq('status', 'dorucena')
  .neq('status', 'zrusena')

// Planting Plans
const { data: plans } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .eq('status', 'growing')

// Order Items for capacity calculation
const { data: orderItems } = await supabase
  .from('order_items')
  .select('*, orders!inner(*)')
  .gte('orders.delivery_date', today)
  .lte('orders.delivery_date', sevenDaysFromNow)
```

---

### 2. TodayTasksPage (`/today` - TodayTasksPage.tsx)

**Route**: `/today`

**Supabase Tables**:
- **Read**: `planting_plans`, `orders`, `products`, `blends`, `customers`
- **Write**: `planting_plans` (update status)

**Key Features**:
1. **Soaking Tasks**:
   - Seeds that need soaking X hours before sowing
   - Calculated: sow_date - soaking_duration_hours = today
   - Shows crop name, soak time, sow date

2. **Sowing Tasks**:
   - Filter: status = 'planned' AND sow_date = today
   - Shows crop/blend, tray count, seed amount
   - Update button to mark as 'sown'

3. **Weight Removal Tasks**:
   - Calculated: sow_date + days_to_germination = today
   - Filter: status = 'sown'
   - Shows crop, sow date, removal due date

4. **Move to Light Tasks**:
   - Calculated: sow_date + days_in_darkness = today
   - Filter: status = 'sown' or 'growing'
   - Shows crop, sow date, light exposure date

5. **Harvest Tasks**:
   - Filter: expected_harvest_date = today AND status = 'growing'
   - Shows crop, tray count, expected harvest date
   - Update button to mark as 'harvested'

6. **Delivery/Packing Tasks**:
   - Filter: delivery_date = today
   - Shows customer, crop, quantity, packaging size, delivery form
   - Groups by order_id

7. **Daily Summary**:
   - Task counts per category
   - Completion percentage
   - Priority indicators

**State Managed**:
```typescript
- soakingTasks: PlantingPlan[] // Seeds to soak today
- sowingTasks: PlantingPlan[] // Plantings to sow today
- weightRemovalTasks: PlantingPlan[] // Remove weights today
- lightTasks: PlantingPlan[] // Move to light today
- harvestTasks: PlantingPlan[] // Harvest today
- deliveryTasks: Order[] // Deliver today
- selectedDate: Date // Date filter (default: today)
```

**Queries**:
```typescript
// Sowing Tasks
const { data: sowingTasks } = await supabase
  .from('planting_plans')
  .select('*, products(*), blends(*)')
  .eq('status', 'planned')
  .eq('sow_date', today)

// Harvest Tasks
const { data: harvestTasks } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .eq('status', 'growing')
  .eq('expected_harvest_date', today)

// Delivery Tasks
const { data: deliveryTasks } = await supabase
  .from('orders')
  .select('*, customers(*), order_items(*, products(*))')
  .eq('delivery_date', today)

// Update Planting Status
await supabase
  .from('planting_plans')
  .update({ status: 'sown' })
  .eq('id', planId)
```

---

### 3. CropsPage (`/crops` - CropsPage.tsx)

**Route**: `/crops`

**Supabase Tables**:
- **Read/Write**: `products`

**Key Features**:
1. **CRUD Operations**:
   - Create new crop/microgreen
   - Edit existing crop
   - Delete crop (admin only)
   - Duplicate crop

2. **Crop Properties** (18+ fields):
   - `name` - Crop name (required)
   - `variety` - Variety/cultivar
   - `category` - microgreens | microherbs | edible_flowers
   - `sku_prefix` - SKU prefix for labels
   - `color` - Color hex code for visual identification
   - `days_to_harvest` - Total days from sow to harvest
   - `days_to_germination` - Days until germination
   - `germination_type` - warm | cold
   - `needs_weight` - Requires weight during germination
   - `days_in_darkness` - Days in darkness phase
   - `days_on_light` - Days in light phase
   - `seed_density` - Default seed density (grams per tray)
   - `expected_yield` - Default yield (grams per tray)
   - `seed_soaking` - Requires pre-soak
   - `soaking_duration_hours` - Hours to soak
   - `can_be_cut` - Can be delivered as cut
   - `can_be_live` - Can be delivered live in tray
   - `default_substrate_type` - coconut | peat | other
   - `default_substrate_note` - Custom substrate notes
   - `safety_buffer_percent` - Safety buffer for planting
   - `harvest_order` - Order in harvest list
   - `notes` - Additional notes

3. **Tray Configurations** (JSONB field: `tray_configs`):
   ```json
   {
     "XL": { "seed_density": 120, "expected_yield": 100 },
     "L": { "seed_density": 100, "expected_yield": 80 },
     "M": { "seed_density": 80, "expected_yield": 60 },
     "S": { "seed_density": 60, "expected_yield": 40 }
   }
   ```

4. **Filters**:
   - Category filter (microgreens, microherbs, edible_flowers)
   - Text search (name, variety)

5. **View Modes**:
   - Grid view (cards with color)
   - List view (compact list)
   - Table view (full table)

6. **Mobile Optimizations**:
   - Expandable cards
   - Pull-to-refresh
   - Swipe actions (edit, delete)

**State Managed**:
```typescript
- crops: Crop[] // All crops
- formData: Partial<Crop> // Form state (18+ fields)
- isDialogOpen: boolean // Add/Edit dialog
- editingCrop: Crop | null // Currently editing
- categoryFilter: string // Filter by category
- viewMode: 'grid' | 'list' | 'table' // View mode
- expandedCards: Set<string> // Expanded card IDs (mobile)
```

**Queries**:
```typescript
// Fetch all crops
const { data: crops } = await supabase
  .from('products')
  .select('*')
  .order('name')

// Add crop
await supabase
  .from('products')
  .insert({
    name,
    variety,
    category,
    days_to_harvest,
    // ... all other fields
    tray_configs: {
      XL: { seed_density: 120, expected_yield: 100 },
      L: { seed_density: 100, expected_yield: 80 },
      M: { seed_density: 80, expected_yield: 60 },
      S: { seed_density: 60, expected_yield: 40 }
    }
  })

// Update crop
await supabase
  .from('products')
  .update({ ...formData })
  .eq('id', cropId)

// Delete crop
await supabase
  .from('products')
  .delete()
  .eq('id', cropId)
```

---

### 4. CustomersPage (`/customers` - CustomersPage.tsx)

**Route**: `/customers`

**Supabase Tables**:
- **Read/Write**: `customers`, `delivery_routes`
- **Read**: `orders` (for statistics)

**Key Features**:
1. **Customer Types** (different form fields per type):
   - **Home** (domestic): Name, phone, email, address, delivery route, payment method
   - **Gastro**: Company name, contact name, ICO, DIC, IC DPH, bank account, etc.
   - **Wholesale**: Similar to Gastro with wholesale-specific fields

2. **Customer Properties**:
   - `name` - Customer name (required)
   - `customer_type` - domestic | gastro | wholesale
   - `company_name` - Company name (Gastro/Wholesale)
   - `contact_name` - Contact person
   - `email` - Email address
   - `phone` - Phone number
   - `address` - Delivery address
   - `ico` - Company ID (Czech/Slovak)
   - `dic` - Tax ID
   - `ic_dph` - VAT ID
   - `bank_account` - Bank account number
   - `delivery_route_id` - Assigned delivery route
   - `delivery_day_ids` - Array of delivery day IDs
   - `payment_method` - cash | card | bank_transfer
   - `free_delivery` - Toggle for free delivery
   - `default_packaging_type` - disposable | returnable
   - `delivery_notes` - Special delivery instructions
   - `notes` - General notes

3. **Customer Statistics** (calculated from orders):
   - Order count (total orders)
   - Total volume (sum of order quantities)
   - Last order date
   - Average order value

4. **Quick Actions**:
   - **Call**: `tel:${phone}` link
   - **Email**: `mailto:${email}` link
   - **Navigate**: Waze or Google Maps link
     - Waze: `https://waze.com/ul?q=${encodedAddress}`
     - Maps: `https://maps.google.com/?q=${encodedAddress}`
   - **Mobile**: Swipe navigation icon to toggle Waze/Maps

5. **Filters**:
   - Customer type (Home, Gastro, Wholesale)
   - Delivery route
   - Text search (name, email, phone)

**State Managed**:
```typescript
- customers: Customer[] // All customers
- customerStats: Map<string, Stats> // Order stats per customer
- formData: Partial<Customer> // Form state
- isDialogOpen: boolean // Add/Edit dialog
- editingCustomer: Customer | null // Currently editing
- typeFilter: string // Filter by customer type
- routeFilter: string // Filter by route
- navApp: 'waze' | 'maps' // Navigation app preference
```

**Queries**:
```typescript
// Fetch all customers
const { data: customers } = await supabase
  .from('customers')
  .select('*, delivery_routes(*)')
  .order('name')

// Fetch customer statistics
const { data: orders } = await supabase
  .from('orders')
  .select('customer_id, quantity, total_price, order_date')
  .eq('customer_id', customerId)

// Add customer
await supabase
  .from('customers')
  .insert({
    name,
    customer_type,
    email,
    phone,
    address,
    delivery_route_id,
    // ... other fields
  })

// Update customer
await supabase
  .from('customers')
  .update({ ...formData })
  .eq('id', customerId)

// Delete customer
await supabase
  .from('customers')
  .delete()
  .eq('id', customerId)
```

---

### 5. SuppliersPage (`/suppliers` - SuppliersPage.tsx)

**Route**: `/suppliers`

**Supabase Tables**:
- **Read/Write**: `suppliers`

**Key Features**:
1. **Supplier Types**:
   - Seeds supplier
   - Packaging supplier
   - Substrate supplier
   - Other supplier

2. **Supplier Properties**:
   - `name` - Supplier name (required)
   - `company_name` - Company name
   - `supplier_type` - seeds | packaging | substrate | other
   - `contact_name` - Contact person
   - `email` - Email address
   - `phone` - Phone number
   - `address` - Address
   - `ico` - Company ID
   - `dic` - Tax ID
   - `ic_dph` - VAT ID
   - `bank_account` - Bank account
   - `notes` - Notes

3. **Quick Actions**:
   - Call: `tel:${phone}`
   - Email: `mailto:${email}`
   - Navigate: Waze/Maps

4. **Filters**:
   - Supplier type
   - Text search

**State Managed**:
```typescript
- suppliers: Supplier[] // All suppliers
- formData: Partial<Supplier> // Form state
- isDialogOpen: boolean
- editingSupplier: Supplier | null
- typeFilter: string
- searchQuery: string
```

**Queries**:
```typescript
// Fetch all suppliers
const { data: suppliers } = await supabase
  .from('suppliers')
  .select('*')
  .order('name')

// Add supplier
await supabase
  .from('suppliers')
  .insert({ ...formData })

// Update supplier
await supabase
  .from('suppliers')
  .update({ ...formData })
  .eq('id', supplierId)

// Delete supplier
await supabase
  .from('suppliers')
  .delete()
  .eq('id', supplierId)
```

---

### 6. OrdersPage (`/orders` - OrdersPage.tsx)

**Route**: `/orders`

**Supabase Tables**:
- **Read**: `orders`, `order_items`, `customers`, `products`, `blends`, `delivery_routes`, `prices`, `packagings`, `delivery_days`, `planting_plans`, `packaging_mappings`
- **Write**: `orders`, `order_items`, `planting_plans`, `packagings` (decrement stock)

**Key Features**:

1. **Order Types**:
   - **Single** - One-time order
   - **Weekly** - Recurring every week
   - **Biweekly** - Recurring every 2 weeks

2. **Order Properties**:
   - `customer_id` - Customer (required)
   - `customer_name` - Customer name (denormalized)
   - `customer_type` - domestic | gastro | wholesale
   - `delivery_date` - Delivery date (required)
   - `status` - cakajuca | pestovanie | pripravena | dorucena | zrusena
   - `is_recurring` - Is this a recurring order?
   - `recurrence_pattern` - weekly | biweekly
   - `recurring_weeks` - Number of weeks to repeat
   - `recurring_days` - Array of day numbers (0-6)
   - `parent_order_id` - Parent order ID (for recurring instances)
   - `recurring_order_id` - Recurring group ID
   - `skipped` - Is this instance skipped?
   - `delivery_route_id` - Assigned route
   - `route` - Route name (denormalized)
   - `charge_delivery` - Should delivery be charged?
   - `delivery_price` - Delivery fee
   - `total_price` - Total order price
   - `order_number` - Order number
   - `notes` - Order notes

3. **Order Items** (order_items table):
   - `order_id` - Parent order
   - `crop_id` - Crop ID (if single crop)
   - `crop_name` - Crop name (denormalized)
   - `blend_id` - Blend ID (if blend)
   - `quantity` - Quantity in grams
   - `unit` - g | kg | ks (pieces)
   - `package_type` - disposable | returnable | none
   - `package_ml` - 250 | 500 | 750 | 1000 | 1200
   - `delivery_form` - cut | live
   - `has_label_req` - Requires label?
   - `special_requirements` - Special instructions
   - `is_special_item` - Not a crop (e.g., substrate, packaging)
   - `custom_crop_name` - Custom name for special items
   - `price_per_unit` - Price per gram/kg/piece
   - `total_price` - Total item price
   - `notes` - Item notes

4. **Recurring Order Management**:
   - **Extend Dialog**: Extend recurring order by X weeks
   - **Edit Dialog**:
     - Edit single instance (update only this)
     - Edit all future instances (update this + all future)
   - **Delete Dialog**:
     - Delete single instance (skip this)
     - Delete all future instances (delete this + all future)

5. **Delivery Fee Calculation** (Priority Order):
   ```
   1. Free Delivery Toggle (customer.free_delivery OR manual toggle) → Fee = 0
   2. Manual Delivery Override → Use manual amount
   3. Auto-calculate from Route:
      - Get route by delivery_route_id
      - Get fee: route.delivery_fee_[customer_type]
      - Get min for free: route.[customer_type]_min_free_delivery
      - If total_price >= min_free_delivery → Fee = 0
      - Else → Fee = delivery_fee_[customer_type]
   ```

6. **Capacity Checking**:
   - When adding order, check harvest capacity
   - Compare available capacity (trays × yield) vs. ordered quantity
   - Warn if capacity exceeded
   - Suggest planting more trays

7. **Price Auto-Fetch**:
   - Fetch from `prices` table
   - Match: crop_id OR blend_id, package_ml, customer_type
   - Manual override supported

8. **Packaging Stock Deduction**:
   - When order status = 'pripravena' (ready)
   - Call RPC: `decrement_packaging_stock(packaging_id, quantity)`
   - Decrement `packagings.quantity`

9. **Special Items Support**:
   - Can add non-crop items (e.g., substrate, packaging)
   - Set `is_special_item = true`
   - Enter `custom_crop_name`

10. **Filters**:
    - Period: all | today | this_week | next_week | this_month | custom_range
    - Status: all | cakajuca | pestovanie | pripravena | dorucena | zrusena
    - Customer type: all | domestic | gastro | wholesale
    - Crop/Blend: all | specific crop/blend
    - Category: all | microgreens | microherbs | edible_flowers

11. **Calendar View**:
    - Shows delivery dates
    - Highlights delivery days
    - Click date to create order

**State Managed**:
```typescript
- orders: Order[] // All orders
- orderItems: OrderItem[] // Items for current order
- filteredOrders: Order[] // After filters
- currentItem: Partial<OrderItem> // Current item being added
- selectedDates: Date[] // Calendar date selection
- isDialogOpen: boolean // Add/Edit dialog
- editingOrder: Order | null // Currently editing
- periodFilter: string // Date range filter
- statusFilter: string // Status filter
- customerTypeFilter: string // Customer type filter
- cropFilter: string // Crop/blend filter
- categoryFilter: string // Category filter
- calculatedDeliveryPrice: number // Auto-calculated delivery fee
- freeDelivery: boolean // Free delivery toggle
- manualDeliveryAmount: number | null // Manual delivery override
- isRecurring: boolean // Recurring order toggle
- recurringType: 'weekly' | 'biweekly'
- recurringWeeks: number // Duration
- recurringDays: number[] // Selected days (0-6)
```

**Queries**:
```typescript
// Fetch orders with filters
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*), delivery_routes(*)')
  .gte('delivery_date', startDate)
  .lte('delivery_date', endDate)
  .eq('status', statusFilter) // if statusFilter != 'all'
  .order('delivery_date', { ascending: false })

// Fetch order items
const { data: items } = await supabase
  .from('order_items')
  .select('*, products(*), blends(*)')
  .eq('order_id', orderId)

// Create order with items
const { data: order } = await supabase
  .from('orders')
  .insert({
    customer_id,
    customer_name,
    customer_type,
    delivery_date,
    status: 'cakajuca',
    is_recurring,
    recurrence_pattern,
    recurring_weeks,
    recurring_days,
    delivery_route_id,
    route,
    charge_delivery,
    delivery_price,
    total_price,
    notes
  })
  .select()
  .single()

// Create order items
const itemInserts = orderItems.map(item => ({
  order_id: order.id,
  crop_id: item.crop_id,
  crop_name: item.crop_name,
  blend_id: item.blend_id,
  quantity: item.quantity,
  unit: item.unit,
  package_type: item.package_type,
  package_ml: item.package_ml,
  delivery_form: item.delivery_form,
  has_label_req: item.has_label_req,
  price_per_unit: item.price_per_unit,
  total_price: item.total_price,
  is_special_item: item.is_special_item,
  custom_crop_name: item.custom_crop_name,
  special_requirements: item.special_requirements,
  notes: item.notes
}))

await supabase
  .from('order_items')
  .insert(itemInserts)

// Fetch prices
const { data: price } = await supabase
  .from('prices')
  .select('unit_price')
  .eq(cropId ? 'crop_id' : 'blend_id', cropId || blendId)
  .eq('packaging_size', package_ml)
  .eq('customer_type', customer_type)
  .maybeSingle()

// Update recurring order instances (edit all future)
await supabase
  .from('orders')
  .update({ ...updates })
  .eq('recurring_order_id', recurringOrderId)
  .gte('delivery_date', currentDeliveryDate)

// Delete recurring order instances (delete all future)
await supabase
  .from('orders')
  .delete()
  .eq('recurring_order_id', recurringOrderId)
  .gte('delivery_date', currentDeliveryDate)

// Extend recurring order
// Create new order instances for X additional weeks

// Decrement packaging stock (RPC)
await supabase.rpc('decrement_packaging_stock', {
  p_packaging_id: packaging_id,
  p_quantity: quantity
})
```

---

### 7. PlantingPlanPage (`/planting` - PlantingPlanPage.tsx)

**Route**: `/planting`

**Supabase Tables**:
- **Read**: `planting_plans`, `products`, `orders`, `order_items`, `blends`
- **Write**: `planting_plans`

**Key Features**:

1. **Auto-Generate Planting Plans**:
   - Analyzes active orders (status != 'dorucena', 'zrusena')
   - Groups by crop_id/blend_id + harvest_date
   - Calculates total quantity needed
   - Determines tray count based on expected_yield
   - Applies safety_buffer_percent
   - Creates planting_plan records
   - Button: "Generovať plán sadenia" (Generate Planting Plan)

2. **Manual Planting Plan Creation**:
   - Select crop or blend
   - Choose tray size (XL, L, M, S)
   - Enter tray count
   - Set sow date
   - Select source orders (optional)
   - Toggle "count_as_production" (count toward production stats)
   - Toggle "is_test" (test planting)
   - Option to use custom seed density

3. **Mixed Planting Support**:
   - Toggle "is_mixed" checkbox
   - Add multiple crops with percentages
   - Example: 50% Sunflower + 50% Radish
   - Seed density calculated as weighted average
   - Stores in `mix_configuration` JSONB:
     ```json
     [
       { "crop_id": "uuid", "crop_name": "Sunflower", "percentage": 50 },
       { "crop_id": "uuid", "crop_name": "Radish", "percentage": 50 }
     ]
     ```

4. **Planting Plan Properties**:
   - `id` - UUID
   - `crop_id` - Crop ID (if single crop)
   - `order_id` - Source order ID (deprecated, use source_orders)
   - `source_orders` - Array of source order IDs
   - `sow_date` - Date to sow seeds
   - `expected_harvest_date` - Calculated: sow_date + days_to_harvest
   - `actual_harvest_date` - Actual harvest date (set when harvested)
   - `tray_size` - XL | L | M | S
   - `tray_count` - Number of trays
   - `seed_amount_grams` - Seed density per tray
   - `total_seed_grams` - Total seeds needed (tray_count × seed_amount_grams)
   - `status` - planned | sown | growing | harvested
   - `seed_id` - Specific seed lot used
   - `substrate_type` - coconut | peat | other
   - `substrate_note` - Custom substrate notes
   - `safety_buffer_percent` - Safety buffer (default from crop)
   - `count_as_production` - Count in production stats
   - `is_mixed` - Is mixed planting?
   - `mix_configuration` - JSONB array of crops + percentages
   - `is_test` - Is test planting?
   - `notes` - Notes

5. **Grouped View**:
   - Groups by crop_id + sow_date
   - Shows total trays per group
   - Shows total seed grams per group
   - Expandable to see individual plans

6. **Status Updates**:
   - "Planned" → "Sown" (when seeded)
   - "Sown" → "Growing" (when germinated)
   - "Growing" → "Harvested" (when harvested)

7. **Filters**:
   - Date range (harvest date)
   - Crop
   - Status
   - Tray size
   - Test plantings (show/hide)

8. **Seed Density Calculation**:
   - Single crop: Use `tray_configs[tray_size].seed_density`
   - Mixed crop: Weighted average of crop densities
   - Custom: Override with custom value

**State Managed**:
```typescript
- plans: PlantingPlan[] // All planting plans
- groupedPlans: GroupedPlan[] // Grouped by crop + sow_date
- formData: Partial<PlantingPlan> // Form state
- isDialogOpen: boolean // Add/Edit dialog
- editingPlan: PlantingPlan | null // Currently editing
- isMixedPlanting: boolean // Mixed planting toggle
- mixCrops: MixCrop[] // Array of { cropId, cropName, percentage }
- selectedTraySize: 'XL' | 'L' | 'M' | 'S'
- trayCount: number
- useCustomDensity: boolean
- customSeedDensity: number
- seedDensity: number // Calculated or custom
- totalSeedGrams: number // tray_count × seed_density
- selectedSourceOrders: string[] // Array of order IDs
- filterHarvestDateStart: Date
- filterHarvestDateEnd: Date
- filterCropId: string
- filterStatus: string
- filterTraySize: string
- showTestPlantings: boolean
```

**Queries**:
```typescript
// Fetch planting plans
const { data: plans } = await supabase
  .from('planting_plans')
  .select('*, products(*), blends(*)')
  .gte('expected_harvest_date', startDate)
  .lte('expected_harvest_date', endDate)
  .order('sow_date', { ascending: false })

// Auto-generate planting plans (RPC function)
const { data, error } = await supabase.rpc('generate_planting_plan', {
  p_start_date: startDate,
  p_end_date: endDate,
  p_include_test: false
})

// Create planting plan
await supabase
  .from('planting_plans')
  .insert({
    crop_id,
    source_orders: [orderId1, orderId2],
    sow_date,
    expected_harvest_date,
    tray_size,
    tray_count,
    seed_amount_grams,
    total_seed_grams,
    status: 'planned',
    substrate_type,
    substrate_note,
    safety_buffer_percent,
    count_as_production: true,
    is_mixed,
    mix_configuration,
    is_test: false,
    notes
  })

// Update plan status
await supabase
  .from('planting_plans')
  .update({ status: 'sown' })
  .eq('id', planId)

// Delete plan
await supabase
  .from('planting_plans')
  .delete()
  .eq('id', planId)

// Fetch orders for auto-generation
const { data: orders } = await supabase
  .from('orders')
  .select('*, order_items(*, products(*), blends(*))')
  .gte('delivery_date', startDate)
  .lte('delivery_date', endDate)
  .neq('status', 'dorucena')
  .neq('status', 'zrusena')
```

**Auto-Generation Logic**:
```typescript
// Pseudocode for auto-generation
1. Fetch all active orders in date range
2. Group order_items by crop_id/blend_id + harvest_date
3. For each group:
   - Calculate total_quantity_needed = SUM(order_items.quantity)
   - Get crop expected_yield for default tray size
   - Calculate trays_needed = total_quantity_needed / expected_yield
   - Apply safety_buffer: trays_needed *= (1 + safety_buffer_percent / 100)
   - Round up trays_needed
   - Calculate sow_date = harvest_date - days_to_harvest - harvest_days_before_delivery
   - Check if planting_plan already exists for crop + sow_date
   - If not, create new planting_plan
4. Return summary of created plans
```

---

### 8. BlendsPage (`/blends` - BlendsPage.tsx)

**Route**: `/blends`

**Supabase Tables**:
- **Read/Write**: `blends`, `products`

**Key Features**:
1. **Blend Management**:
   - Create custom crop blends (e.g., "Salad Mix")
   - Add multiple crops with percentages
   - Percentage must sum to 100%

2. **Blend Properties**:
   - `name` - Blend name (required)
   - `crop_ids` - Array of crop UUIDs
   - `crop_percentages` - JSONB: `{ "crop_id_1": 50, "crop_id_2": 50 }`
   - `notes` - Notes

3. **Blend Display**:
   - Shows crop names with percentages
   - Color-coded by crop colors
   - Used in orders and planting plans

**State Managed**:
```typescript
- blends: Blend[] // All blends
- formData: Partial<Blend> // Form state
- selectedCrops: { cropId: string, percentage: number }[]
- isDialogOpen: boolean
- editingBlend: Blend | null
```

**Queries**:
```typescript
// Fetch blends
const { data: blends } = await supabase
  .from('blends')
  .select('*')
  .order('name')

// Fetch crops for blend selection
const { data: crops } = await supabase
  .from('products')
  .select('id, name, color')
  .order('name')

// Create blend
await supabase
  .from('blends')
  .insert({
    name,
    crop_ids: selectedCrops.map(c => c.cropId),
    crop_percentages: Object.fromEntries(
      selectedCrops.map(c => [c.cropId, c.percentage])
    ),
    notes
  })

// Update blend
await supabase
  .from('blends')
  .update({ ...formData })
  .eq('id', blendId)

// Delete blend
await supabase
  .from('blends')
  .delete()
  .eq('id', blendId)
```

---

### 9. PricesPage (`/prices` - PricesPage.tsx)

**Route**: `/prices`

**Supabase Tables**:
- **Read/Write**: `prices`, `products`, `blends`

**Key Features**:
1. **Price Matrix**:
   - Rows: Crops/Blends
   - Columns: Packaging sizes × Customer types
   - Cells: Unit price (per gram or per piece)

2. **Price Properties**:
   - `crop_id` - Crop ID (if single crop)
   - `blend_id` - Blend ID (if blend)
   - `packaging_size` - 250 | 500 | 750 | 1000 | 1200 (ml)
   - `customer_type` - domestic | gastro | wholesale
   - `unit_price` - Price per gram or piece
   - `unit` - g | kg | ks (pieces)

3. **Packaging Sizes**:
   - 250ml
   - 500ml
   - 750ml
   - 1000ml
   - 1200ml

4. **Customer Types**:
   - Home (domestic)
   - Gastro
   - Wholesale

5. **Bulk Operations**:
   - Apply percentage increase/decrease to all prices
   - Copy prices from one customer type to another
   - Export prices to CSV/Excel

**State Managed**:
```typescript
- prices: Price[] // All prices
- priceMatrix: Map<string, Map<string, number>> // crop_id → (size_type → price)
- crops: Crop[]
- blends: Blend[]
- isDialogOpen: boolean
- editingPrice: Price | null
```

**Queries**:
```typescript
// Fetch all prices
const { data: prices } = await supabase
  .from('prices')
  .select('*')
  .order('crop_id')

// Fetch crops
const { data: crops } = await supabase
  .from('products')
  .select('id, name')
  .order('name')

// Fetch blends
const { data: blends } = await supabase
  .from('blends')
  .select('id, name')
  .order('name')

// Add/Update price
await supabase
  .from('prices')
  .upsert({
    crop_id,
    blend_id,
    packaging_size,
    customer_type,
    unit_price
  }, {
    onConflict: 'crop_id,blend_id,packaging_size,customer_type'
  })

// Delete price
await supabase
  .from('prices')
  .delete()
  .eq('id', priceId)

// Bulk update (apply percentage)
const updates = prices.map(price => ({
  ...price,
  unit_price: price.unit_price * (1 + percentage / 100)
}))

await supabase
  .from('prices')
  .upsert(updates)
```

---

### 10. Inventory Pages (Brief Overview)

#### SeedsPage (`/inventory/seeds`)
- **Tables**: `seeds`, `products`, `suppliers`
- **Features**: Seed stock management, lot numbers, expiration tracking, certificates (PDF upload)
- **Key Fields**: crop_id, supplier_id, quantity, unit (g/kg), lot_number, purchase_date, expiry_date, consumption_start_date, consumption_end_date, certificate_url, min_stock, price_per_unit, vat_percentage, finished_date

#### PackagingPage (`/inventory/packaging`)
- **Tables**: `packagings`, `suppliers`
- **Features**: Packaging materials inventory
- **Key Fields**: name, type, size, packaging_type (disposable/returnable), packaging_size_ml (250/500/750/1000/1200), quantity, supplier_id, min_stock, price_per_unit, vat_percentage

#### SubstratePage (`/inventory/substrate`)
- **Tables**: `substrates`, `suppliers`
- **Features**: Growing substrate inventory (coconut, peat, mixed)
- **Key Fields**: name, type (coconut/peat/other), quantity, unit (l/kg), supplier_id, min_stock, price_per_unit, vat_percentage

#### LabelsPage (`/inventory/labels`)
- **Tables**: `labels`, `suppliers`
- **Features**: Label inventory
- **Key Fields**: name, quantity, supplier_id, notes

#### ConsumableInventoryPage (`/inventory/consumables`)
- **Tables**: `consumable_inventory`, `suppliers`
- **Features**: Consumable items (e.g., trays, spray bottles, tools)
- **Key Fields**: name, category, quantity, unit, supplier_id, min_stock, price_per_unit, price_includes_vat, vat_percentage

#### OtherInventoryPage (`/inventory/other`)
- **Tables**: `other_inventory`, `suppliers`
- **Features**: Miscellaneous inventory items
- **Key Fields**: name, quantity, unit, supplier_id, notes

---

### 11. Cost Tracking Pages (Brief Overview)

All cost pages follow similar patterns:

#### FuelCostsPage (`/costs/fuel`)
- **Table**: `fuel_costs`
- **Fields**: date, liters, price_per_liter, total_cost, vat_percentage, notes

#### AdblueCostsPage (`/costs/adblue`)
- **Table**: `adblue_costs`
- **Fields**: date, liters, price_per_liter, total_cost, vat_percentage, notes

#### ElectricityCostsPage (`/costs/electricity`)
- **Table**: `electricity_costs`
- **Fields**: date, kwh, price_per_kwh, total_cost, vat_percentage, notes

#### WaterCostsPage (`/costs/water`)
- **Table**: `water_costs`
- **Fields**: date, cubic_meters, price_per_m3, total_cost, vat_percentage, notes

#### CarServiceCostsPage (`/costs/car-service`)
- **Table**: `car_service_costs`
- **Fields**: date, service_type, description, cost, vat_percentage, notes

#### OtherCostsPage (`/costs/other`)
- **Table**: `other_costs`
- **Fields**: date, category, description, cost, vat_percentage, notes

---

### 12. Other Pages (Brief Overview)

#### DeliveryPage (`/delivery`)
- **Tables**: `orders`, `delivery_routes`, `customers`
- **Features**: Delivery route planning, order grouping by route, navigation links

#### CalendarPage (`/calendar`)
- **Tables**: `orders`, `planting_plans`
- **Features**: Calendar view of orders and plantings

#### HarvestPackingPage (`/harvest-packing`)
- **Tables**: `orders`, `order_items`, `planting_plans`, `packagings`
- **Features**: Harvest workflow, packing checklist, packaging stock deduction

#### PrepPlantingPage (`/prep-planting`)
- **Tables**: `planting_plans`, `seeds`
- **Features**: Prepare materials for planting, seed allocation

#### PrepPackagingPage (`/prep-packaging`)
- **Tables**: `orders`, `packagings`
- **Features**: Prepare packaging materials for orders

#### UsersPage (`/users`)
- **Tables**: `profiles`, `user_roles`
- **Features**: User management (admin only), role assignment, permissions

#### SettingsPage (`/settings`)
- **Tables**: `profiles`, `global_vat_settings`, `delivery_days_settings`, `delivery_routes`
- **Features**: System settings, VAT config, delivery days, harvest settings, sidebar management

#### ReportsPage (`/reports`)
- **Tables**: Multiple (orders, costs, inventory)
- **Features**: Reports and analytics, export to PDF/Excel

#### AuthPage (`/auth`)
- **Tables**: Auth tables (Supabase Auth)
- **Features**: Login, signup, password reset, 2FA setup/verify

---

## All Components Analysis

### Layout Components

#### 1. MainLayout (`src/components/layout/MainLayout.tsx`)
**Purpose**: Main application wrapper with responsive layout

**Props**:
```typescript
interface MainLayoutProps {
  children: React.ReactNode;
}
```

**Features**:
- Desktop: Sidebar + Header + Content
- Mobile: MobileHeader + Content + MobileBottomNav
- Responsive breakpoint: 768px
- Uses `useAuth()` for user context
- Uses `useIsMobile()` for responsive detection

**Supabase Tables**: None (layout only)

---

#### 2. Sidebar (`src/components/layout/Sidebar.tsx`)
**Purpose**: Desktop navigation sidebar

**Props**: None

**Features**:
- Customizable menu items (stored in `profiles.sidebar_items_order`)
- Collapsible/expandable
- Active route highlighting
- User info display
- Logout button
- Icons from Lucide React

**State**:
```typescript
- isCollapsed: boolean // Sidebar collapsed state
- sidebarItems: MenuItem[] // Custom menu order
```

**Supabase Tables**:
- **Read**: `profiles` (sidebar_items_order)

**Menu Items** (default order):
```typescript
[
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Dnešné úlohy', icon: CheckSquare, path: '/today' },
  { label: 'Plodiny', icon: Sprout, path: '/crops' },
  { label: 'Zákazníci', icon: Users, path: '/customers' },
  { label: 'Dodávatelia', icon: Truck, path: '/suppliers' },
  { label: 'Objednávky', icon: ShoppingCart, path: '/orders' },
  { label: 'Plán sadenia', icon: Calendar, path: '/planting' },
  { label: 'Mixy', icon: Blend, path: '/blends' },
  { label: 'Kalendár', icon: CalendarDays, path: '/calendar' },
  { label: 'Dodávky', icon: MapPin, path: '/delivery' },
  { label: 'Zber a balenie', icon: Package, path: '/harvest-packing' },
  { label: 'Príprava sadenia', icon: Seedling, path: '/prep-planting' },
  { label: 'Príprava balenia', icon: PackageOpen, path: '/prep-packaging' },
  { label: 'Ceny', icon: DollarSign, path: '/prices' },
  { label: 'Používatelia', icon: UserCog, path: '/users', adminOnly: true },
  { label: 'Nastavenia', icon: Settings, path: '/settings' },
  { label: 'Reporty', icon: BarChart, path: '/reports' },
  {
    label: 'Sklad',
    icon: Warehouse,
    children: [
      { label: 'Semená', path: '/inventory/seeds' },
      { label: 'Balenie', path: '/inventory/packaging' },
      { label: 'Substrát', path: '/inventory/substrate' },
      { label: 'Etikety', path: '/inventory/labels' },
      { label: 'Spotrebný materiál', path: '/inventory/consumables' },
      { label: 'Ostatné', path: '/inventory/other' },
    ]
  },
  {
    label: 'Náklady',
    icon: Receipt,
    children: [
      { label: 'Palivo', path: '/costs/fuel' },
      { label: 'AdBlue', path: '/costs/adblue' },
      { label: 'Elektrina', path: '/costs/electricity' },
      { label: 'Voda', path: '/costs/water' },
      { label: 'Servis auta', path: '/costs/car-service' },
      { label: 'Ostatné', path: '/costs/other' },
    ]
  },
]
```

---

#### 3. MobileSidebar (`src/components/layout/MobileSidebar.tsx`)
**Purpose**: Mobile navigation drawer

**Props**:
```typescript
interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Features**:
- Slide-in drawer from left
- Same menu items as desktop sidebar
- Close on navigation
- Backdrop overlay

**Supabase Tables**:
- **Read**: `profiles` (sidebar_items_order)

---

#### 4. DesktopHeader (`src/components/layout/DesktopHeader.tsx`)
**Purpose**: Desktop header bar

**Props**: None

**Features**:
- Page title
- User avatar/name
- Notification bell icon
- Settings link
- Logout button

**Supabase Tables**: None

---

#### 5. MobileHeader (`src/components/layout/MobileHeader.tsx`)
**Purpose**: Mobile header bar

**Props**: None

**Features**:
- Hamburger menu button (opens MobileSidebar)
- Page title
- Notification bell icon

**Supabase Tables**: None

---

#### 6. MobileBottomNav (`src/components/mobile/MobileBottomNav.tsx`)
**Purpose**: Mobile bottom navigation bar

**Props**: None

**Features**:
- 5 primary navigation buttons:
  - Dashboard
  - Today's Tasks
  - Orders
  - More (opens MobileSidebar)
  - Profile/Settings
- Active route highlighting
- Icons with labels

**Supabase Tables**: None

---

### UI Components (Shadcn/ui)

The application uses the full Shadcn/ui component library (60+ components). Here are the key custom UI components:

#### 1. mobile-table.tsx
**Purpose**: Mobile-responsive table with expandable rows

**Props**:
```typescript
interface MobileTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  expandableContent?: (row: T) => React.ReactNode;
}
```

**Features**:
- Desktop: Standard table
- Mobile: Cards with expandable details
- Pull-to-refresh support
- Sorting and filtering

---

#### 2. view-toggle.tsx
**Purpose**: Toggle between Grid/List/Table views

**Props**:
```typescript
interface ViewToggleProps {
  view: 'grid' | 'list' | 'table';
  onViewChange: (view: 'grid' | 'list' | 'table') => void;
}
```

---

#### 3. status-select.tsx
**Purpose**: Order status selector with color coding

**Props**:
```typescript
interface StatusSelectProps {
  value: OrderStatus;
  onChange: (status: OrderStatus) => void;
  disabled?: boolean;
}

type OrderStatus = 'cakajuca' | 'pestovanie' | 'pripravena' | 'dorucena' | 'zrusena';
```

**Status Colors**:
- cakajuca (pending): blue
- pestovanie (growing): yellow
- pripravena (ready): green
- dorucena (delivered): gray
- zrusena (cancelled): red

---

#### 4. planting-status-select.tsx
**Purpose**: Planting status selector

**Props**:
```typescript
interface PlantingStatusSelectProps {
  value: PlantingStatus;
  onChange: (status: PlantingStatus) => void;
  disabled?: boolean;
}

type PlantingStatus = 'planned' | 'sown' | 'growing' | 'harvested';
```

---

#### 5. pull-to-refresh.tsx
**Purpose**: Pull-to-refresh gesture component

**Props**:
```typescript
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}
```

**Usage**:
```tsx
<PullToRefresh onRefresh={async () => { await refetch(); }}>
  {content}
</PullToRefresh>
```

---

#### 6. page-components.tsx
**Purpose**: Reusable page component patterns

**Components**:
```typescript
// Page header with title and actions
<PageHeader
  title="Plodiny"
  actions={<Button onClick={handleAdd}>Pridať plodinu</Button>}
/>

// Stat card for dashboard
<StatCard
  title="Aktívne objednávky"
  value={42}
  icon={<ShoppingCart />}
  trend="+12%"
/>

// Empty state
<EmptyState
  icon={<Inbox />}
  title="Žiadne objednávky"
  description="Pridajte svoju prvú objednávku"
  action={<Button onClick={handleAdd}>Pridať objednávku</Button>}
/>
```

---

### Order Components

#### 1. SearchableCustomerSelect (`src/components/orders/SearchableCustomerSelect.tsx`)
**Purpose**: Searchable customer dropdown with filtering

**Props**:
```typescript
interface SearchableCustomerSelectProps {
  customers: Customer[];
  value: string;
  onValueChange: (customerId: string) => void;
  placeholder?: string;
  filterByType?: 'domestic' | 'gastro' | 'wholesale';
  allowAll?: boolean;
}
```

**Features**:
- Real-time search by name, email, phone
- Filter by customer type
- Keyboard navigation
- "All customers" option (if allowAll=true)

**Supabase Tables**: None (receives customers as prop)

---

#### 2. CategoryFilter (`src/components/orders/CategoryFilter.tsx`)
**Purpose**: Filter orders by crop category

**Props**:
```typescript
interface CategoryFilterProps {
  value: string;
  onChange: (category: string) => void;
  hideLabel?: boolean;
}
```

**Categories**:
- all (Všetky)
- microgreens (Mikrozelení)
- microherbs (Mikrobylinky)
- edible_flowers (Jedlé kvety)

---

#### 3. OrderSearchBar (`src/components/orders/OrderSearchBar.tsx`)
**Purpose**: Text search for orders

**Props**:
```typescript
interface OrderSearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}
```

**Features**:
- Search by customer name, crop name, order number
- Debounced input (300ms)

---

#### 4. RecurringOrderEditDialog (`src/components/orders/RecurringOrderEditDialog.tsx`)
**Purpose**: Edit recurring order instances

**Props**:
```typescript
interface RecurringOrderEditDialogProps {
  open: boolean;
  order: Order;
  onClose: () => void;
  onUpdate: (updates: Partial<Order>, updateAll: boolean) => Promise<void>;
}
```

**Features**:
- Edit single instance (this order only)
- Edit all future instances (this + all future with same recurring_order_id)
- Radio button to select scope
- Form to edit order details

**Supabase Tables**:
- **Write**: `orders` (update single or multiple)

**Update Logic**:
```typescript
// Single instance
await supabase
  .from('orders')
  .update({ ...updates })
  .eq('id', order.id)

// All future instances
await supabase
  .from('orders')
  .update({ ...updates })
  .eq('recurring_order_id', order.recurring_order_id)
  .gte('delivery_date', order.delivery_date)
```

---

#### 5. RecurringOrderDeleteDialog (`src/components/orders/RecurringOrderDeleteDialog.tsx`)
**Purpose**: Delete recurring order instances

**Props**:
```typescript
interface RecurringOrderDeleteDialogProps {
  open: boolean;
  order: Order;
  onClose: () => void;
  onDelete: (deleteAll: boolean) => Promise<void>;
}
```

**Features**:
- Delete single instance (set skipped = true)
- Delete all future instances (delete from DB)
- Confirmation dialog

**Supabase Tables**:
- **Write**: `orders` (update skipped or delete)

**Delete Logic**:
```typescript
// Single instance (skip)
await supabase
  .from('orders')
  .update({ skipped: true })
  .eq('id', order.id)

// All future instances (delete)
await supabase
  .from('orders')
  .delete()
  .eq('recurring_order_id', order.recurring_order_id)
  .gte('delivery_date', order.delivery_date)
```

---

#### 6. RecurringOrderExtendDialog (`src/components/orders/RecurringOrderExtendDialog.tsx`)
**Purpose**: Extend recurring order duration

**Props**:
```typescript
interface RecurringOrderExtendDialogProps {
  open: boolean;
  order: Order;
  onClose: () => void;
  onExtend: (additionalWeeks: number) => Promise<void>;
}
```

**Features**:
- Input number of additional weeks
- Preview of new end date
- Creates new order instances

**Supabase Tables**:
- **Write**: `orders` (insert new instances)

**Extend Logic**:
```typescript
// Calculate new instances
const lastDeliveryDate = getLastDeliveryDate(order.recurring_order_id)
const newInstances = generateOrderInstances(
  order,
  lastDeliveryDate,
  additionalWeeks
)

// Insert new instances
await supabase
  .from('orders')
  .insert(newInstances)
```

---

### Delivery Components

#### 1. RouteManagement (`src/components/delivery/RouteManagement.tsx`)
**Purpose**: Manage delivery routes

**Props**: None

**Features**:
- CRUD for delivery routes
- Route properties:
  - name
  - region
  - stops (JSONB array of addresses)
  - delivery_day_id
  - delivery_fee_home (fee for home customers)
  - delivery_fee_gastro (fee for gastro customers)
  - delivery_fee_wholesale (fee for wholesale customers)
  - home_min_free_delivery (minimum for free delivery)
  - gastro_min_free_delivery
  - wholesale_min_free_delivery
  - max_deliveries_per_day
- Drag-and-drop to reorder stops
- Assign customers to routes

**State**:
```typescript
- routes: DeliveryRoute[]
- editingRoute: DeliveryRoute | null
- stops: RouteStop[] // Array of { address, customer_id, order }
```

**Supabase Tables**:
- **Read/Write**: `delivery_routes`
- **Read**: `customers`

**Queries**:
```typescript
// Fetch routes
const { data: routes } = await supabase
  .from('delivery_routes')
  .select('*')
  .order('name')

// Add route
await supabase
  .from('delivery_routes')
  .insert({
    name,
    region,
    stops: [],
    delivery_day_id,
    delivery_fee_home,
    delivery_fee_gastro,
    delivery_fee_wholesale,
    home_min_free_delivery,
    gastro_min_free_delivery,
    wholesale_min_free_delivery,
    max_deliveries_per_day
  })

// Update route
await supabase
  .from('delivery_routes')
  .update({ ...formData })
  .eq('id', routeId)

// Delete route
await supabase
  .from('delivery_routes')
  .delete()
  .eq('id', routeId)
```

---

#### 2. DeliveryDaysSettings (`src/components/delivery/DeliveryDaysSettings.tsx`)
**Purpose**: Configure delivery days

**Props**: None

**Features**:
- Toggle delivery days (Monday - Sunday)
- Stored in `delivery_days_settings` table
- Per-user setting

**State**:
```typescript
- deliveryDays: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
```

**Supabase Tables**:
- **Read/Write**: `delivery_days_settings`

**Queries**:
```typescript
// Fetch delivery days
const { data: settings } = await supabase
  .from('delivery_days_settings')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle()

// Update delivery days
await supabase
  .from('delivery_days_settings')
  .upsert({
    user_id: userId,
    monday: deliveryDays.monday,
    tuesday: deliveryDays.tuesday,
    // ... other days
  })
```

---

#### 3. DeliveryDaysCompact (`src/components/delivery/DeliveryDaysCompact.tsx`)
**Purpose**: Compact display of delivery days

**Props**:
```typescript
interface DeliveryDaysCompactProps {
  days: number[]; // Array of day numbers (0-6)
}
```

**Features**:
- Shows abbreviated day names (Po, Ut, St, Št, Pi, So, Ne)
- Highlights selected days

---

### Dashboard Components

#### 1. OrdersChart (`src/components/dashboard/OrdersChart.tsx`)
**Purpose**: Chart showing order trends

**Props**: None

**Features**:
- Line chart of orders over time
- Groups by week or month
- Uses Recharts library

**Supabase Tables**:
- **Read**: `orders`, `order_items`

**Queries**:
```typescript
// Fetch orders for last 30 days
const { data: orders } = await supabase
  .from('orders')
  .select('order_date, total_price, status')
  .gte('order_date', thirtyDaysAgo)
  .order('order_date')

// Group by week and calculate totals
const chartData = groupByWeek(orders)
```

---

#### 2. PlantingStats (`src/components/dashboard/PlantingStats.tsx`)
**Purpose**: Planting statistics widget

**Props**: None

**Features**:
- Total trays planted (all time)
- Active plantings (status = 'growing')
- Harvests this week
- Plantings this week

**Supabase Tables**:
- **Read**: `planting_plans`

**Queries**:
```typescript
// Active plantings
const { data: activePlantings } = await supabase
  .from('planting_plans')
  .select('tray_count')
  .eq('status', 'growing')

// Harvests this week
const { data: harvests } = await supabase
  .from('planting_plans')
  .select('*')
  .gte('expected_harvest_date', weekStart)
  .lte('expected_harvest_date', weekEnd)
  .eq('status', 'growing')
```

---

#### 3. LowStockAlerts (`src/components/dashboard/LowStockAlerts.tsx`)
**Purpose**: Low inventory alerts

**Props**: None

**Features**:
- Shows items below min_stock threshold
- Includes: seeds, packaging, substrate, labels, consumables
- Color-coded: red (out of stock), yellow (low stock)

**Supabase Tables**:
- **Read**: `seeds`, `packagings`, `substrates`, `labels`, `consumable_inventory`

**Queries**:
```typescript
// Low stock seeds
const { data: lowSeeds } = await supabase
  .from('seeds')
  .select('*, products(name)')
  .lt('quantity', 'min_stock')

// Low stock packaging
const { data: lowPackaging } = await supabase
  .from('packagings')
  .select('*')
  .lt('quantity', 'min_stock')

// Similar queries for substrates, labels, consumables
```

---

#### 4. SoakingReminders (`src/components/dashboard/SoakingReminders.tsx`)
**Purpose**: Seed soaking reminders

**Props**: None

**Features**:
- Shows seeds that need soaking today
- Calculated: sow_date - soaking_duration_hours = now
- Dismissible notifications

**Supabase Tables**:
- **Read**: `planting_plans`, `products`

**Queries**:
```typescript
// Planting plans needing soaking
const { data: plans } = await supabase
  .from('planting_plans')
  .select('*, products!inner(*)')
  .eq('status', 'planned')
  .eq('products.seed_soaking', true)
  .gte('sow_date', today)
  .lte('sow_date', sevenDaysFromNow)

// Filter by soaking time
const soakingReminders = plans.filter(plan => {
  const soakTime = subHours(plan.sow_date, plan.products.soaking_duration_hours)
  return isToday(soakTime)
})
```

---

#### 5. ProductionOverview (`src/components/dashboard/ProductionOverview.tsx`)
**Purpose**: Production capacity overview

**Props**: None

**Features**:
- Current capacity (trays in growth × yield)
- Upcoming capacity (next 7 days)
- Ordered quantity (next 7 days)
- Capacity utilization percentage

**Supabase Tables**:
- **Read**: `planting_plans`, `orders`, `order_items`, `products`

**Queries**:
```typescript
// Active plantings (capacity)
const { data: plantings } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .eq('status', 'growing')
  .gte('expected_harvest_date', today)
  .lte('expected_harvest_date', sevenDaysFromNow)

// Calculate capacity
const capacity = plantings.reduce((sum, plan) => {
  return sum + (plan.tray_count * plan.products.expected_yield)
}, 0)

// Ordered quantity
const { data: orders } = await supabase
  .from('orders')
  .select('*, order_items(*)')
  .gte('delivery_date', today)
  .lte('delivery_date', sevenDaysFromNow)
  .neq('status', 'zrusena')

const orderedQty = orders.reduce((sum, order) => {
  return sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0)
}, 0)

// Utilization
const utilization = (orderedQty / capacity) * 100
```

---

### Settings Components

#### 1. VATSettings (`src/components/settings/VATSettings.tsx`)
**Purpose**: VAT configuration

**Props**: None

**Features**:
- Global VAT percentage setting
- Applied to prices and costs

**Supabase Tables**:
- **Read/Write**: `global_vat_settings`

**Queries**:
```typescript
// Fetch VAT setting
const { data: vatSettings } = await supabase
  .from('global_vat_settings')
  .select('vat_percentage')
  .maybeSingle()

// Update VAT
await supabase
  .from('global_vat_settings')
  .upsert({ vat_percentage: percentage })
```

---

#### 2. HarvestSettings (`src/components/settings/HarvestSettings.tsx`)
**Purpose**: Harvest day settings

**Props**: None

**Features**:
- Configure harvest_days_before_delivery
- Used to calculate harvest dates from delivery dates

**Supabase Tables**:
- **Read/Write**: `profiles`

**Queries**:
```typescript
// Fetch harvest setting
const { data: profile } = await supabase
  .from('profiles')
  .select('harvest_days_before_delivery')
  .eq('user_id', userId)
  .maybeSingle()

// Update setting
await supabase
  .from('profiles')
  .update({ harvest_days_before_delivery: days })
  .eq('user_id', userId)
```

---

#### 3. SidebarManagement (`src/components/settings/SidebarManagement.tsx`)
**Purpose**: Sidebar menu customization

**Props**: None

**Features**:
- Drag-and-drop to reorder menu items
- Show/hide menu items
- Reset to default order

**Supabase Tables**:
- **Read/Write**: `profiles` (sidebar_items_order)

**Queries**:
```typescript
// Fetch sidebar order
const { data: profile } = await supabase
  .from('profiles')
  .select('sidebar_items_order')
  .eq('user_id', userId)
  .maybeSingle()

// Update order
await supabase
  .from('profiles')
  .update({ sidebar_items_order: newOrder })
  .eq('user_id', userId)
```

---

#### 4. WorkerPermissionsSettings (`src/components/settings/WorkerPermissionsSettings.tsx`)
**Purpose**: Worker role permissions

**Props**: None

**Features**:
- Configure worker permissions per page/feature
- Permissions: view, create, edit, delete
- Per-user settings

**Supabase Tables**:
- **Read/Write**: `user_roles`, `profiles`

**Permissions Structure**:
```typescript
interface WorkerPermissions {
  crops: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  customers: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  orders: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  planting: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  inventory: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  costs: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  prices: { view: boolean, create: boolean, edit: boolean, delete: boolean }
  // ... other features
}
```

---

### Auth Components

#### 1. TwoFactorSetup (`src/components/auth/TwoFactorSetup.tsx`)
**Purpose**: Enable 2FA for user account

**Props**:
```typescript
interface TwoFactorSetupProps {
  onComplete: () => void;
}
```

**Features**:
- Generate TOTP secret
- Show QR code for authenticator app
- Verify setup with test code
- Uses Supabase Auth TOTP

**Supabase**: Supabase Auth API

**Flow**:
```typescript
1. Call supabase.auth.mfa.enroll({ factorType: 'totp' })
2. Get QR code URI
3. Display QR code
4. User scans with authenticator app
5. User enters test code
6. Call supabase.auth.mfa.challengeAndVerify({ factorId, code })
7. If verified, 2FA is enabled
```

---

#### 2. TwoFactorVerify (`src/components/auth/TwoFactorVerify.tsx`)
**Purpose**: Verify 2FA code during login

**Props**:
```typescript
interface TwoFactorVerifyProps {
  factorId: string;
  onVerified: () => void;
}
```

**Features**:
- Input 6-digit code
- Verify code with Supabase Auth
- Error handling for invalid codes

**Supabase**: Supabase Auth API

**Flow**:
```typescript
1. User enters 6-digit code
2. Call supabase.auth.mfa.challengeAndVerify({ factorId, code })
3. If verified, complete login
4. If invalid, show error
```

---

#### 3. LoginHistory (`src/components/auth/LoginHistory.tsx`)
**Purpose**: Display user login history

**Props**: None

**Features**:
- Show login timestamps
- Show IP addresses (if tracked)
- Show device/browser info

**Supabase Tables**:
- **Read**: `login_history`

**Queries**:
```typescript
// Fetch login history
const { data: history } = await supabase
  .from('login_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)
```

---

### Other Components

#### PackagingMappings (`src/components/PackagingMappings.tsx`)
**Purpose**: Map crops/blends to packaging sizes with weights

**Props**: None

**Features**:
- Define weight per packaging size per crop/blend
- Example: Sunflower 250ml = 30g, 500ml = 60g, etc.
- Used in order pricing calculations

**Supabase Tables**:
- **Read/Write**: `packaging_mappings`, `products`, `blends`, `packagings`

**Mapping Structure**:
```typescript
interface PackagingMapping {
  id: string;
  crop_id?: string;
  blend_id?: string;
  packaging_id: string;
  weight_g: number; // Weight in grams for this size
  created_at: Date;
  updated_at: Date;
}
```

**Queries**:
```typescript
// Fetch mappings
const { data: mappings } = await supabase
  .from('packaging_mappings')
  .select('*, products(*), blends(*), packagings:packaging_id(*)')
  .order('crop_id')

// Add mapping
await supabase
  .from('packaging_mappings')
  .insert({
    crop_id,
    blend_id,
    packaging_id,
    weight_g
  })

// Update mapping
await supabase
  .from('packaging_mappings')
  .update({ weight_g })
  .eq('id', mappingId)

// Delete mapping
await supabase
  .from('packaging_mappings')
  .delete()
  .eq('id', mappingId)
```

---

## All Hooks Analysis

### 1. useAuth (`src/hooks/useAuth.tsx`)

**Purpose**: Authentication and user management

**State**:
```typescript
- user: User | null // Current user object
- session: Session | null // Supabase session
- userRole: 'admin' | 'worker' | null // User role
- loading: boolean // Auth initialization state
```

**Methods**:
```typescript
signIn(email: string, password: string): Promise<{ error?: Error }>
signUp(email: string, password: string, fullName: string): Promise<{ error?: Error }>
signOut(): Promise<void>
resetPassword(email: string): Promise<{ error?: Error }>
```

**Returns**:
```typescript
{
  user: User | null
  session: Session | null
  userRole: 'admin' | 'worker' | null
  loading: boolean
  signIn: (email, password) => Promise<{ error? }>
  signUp: (email, password, fullName) => Promise<{ error? }>
  signOut: () => Promise<void>
  resetPassword: (email) => Promise<{ error? }>
  isAdmin: boolean // Computed: userRole === 'admin'
}
```

**Supabase Tables**:
- **Read**: `user_roles`, `profiles`
- **Write**: `login_history` (via Edge Function)

**Implementation**:
```typescript
// Sign in with login tracking
const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error && data.user) {
    // Track login (call Edge Function)
    await supabase.functions.invoke('track-login', {
      body: { user_id: data.user.id }
    })
  }

  return { error }
}

// Fetch user role
const fetchUserRole = async (userId) => {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.role || 'worker'
}

// Listen for auth changes
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    setUser(session?.user || null)
    setSession(session)

    if (session?.user) {
      const role = await fetchUserRole(session.user.id)
      setUserRole(role)
    } else {
      setUserRole(null)
    }
  })

  return () => subscription.unsubscribe()
}, [])
```

---

### 2. useSupabaseData (`src/hooks/useSupabaseData.tsx`)

**Purpose**: Centralized data fetching hooks for all tables

**Hook Pattern** (repeated for each table):
```typescript
function useTableName() {
  const [data, setData] = useState<TableType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const { data: fetchedData, error } = await supabase
      .from('table_name')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      setData(fetchedData || [])
    }
    setLoading(false)
  }

  const add = async (item: Partial<TableType>) => {
    const { error } = await supabase.from('table_name').insert(item)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      await fetchData()
      toast({ title: 'Success', description: 'Item added' })
    }
  }

  const update = async (id: string, updates: Partial<TableType>) => {
    const { error } = await supabase.from('table_name').update(updates).eq('id', id)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      await fetchData()
      toast({ title: 'Success', description: 'Item updated' })
    }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('table_name').delete().eq('id', id)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      await fetchData()
      toast({ title: 'Success', description: 'Item deleted' })
    }
  }

  useEffect(() => {
    fetchData()

    // Real-time subscription
    const subscription = supabase
      .channel('table_name_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { data, loading, refetch: fetchData, add, update, remove }
}
```

**Hooks Provided**:
1. **useCrops()** - Products table
2. **useCustomers()** - Customers table
3. **useSuppliers()** - Suppliers table
4. **useOrders()** - Orders table (with customers join)
5. **useOrderItems()** - Order items table
6. **useBlends()** - Blends table
7. **useSeeds()** - Seeds inventory
8. **usePackagings()** - Packaging inventory
9. **useSubstrates()** - Substrate inventory
10. **useLabels()** - Label inventory
11. **usePlantingPlans()** - Planting plans (with products join)
12. **useTasks()** - Tasks table
13. **useDeliveryRoutes()** - Delivery routes

**Returns** (all hooks):
```typescript
{
  data: T[]
  loading: boolean
  refetch: () => Promise<void>
  add: (item: Partial<T>) => Promise<void>
  update: (id: string, updates: Partial<T>) => Promise<void>
  remove: (id: string) => Promise<void>
}
```

---

### 3. usePrices (`src/hooks/usePrices.tsx`)

**Purpose**: Price management and fetching

**State**:
```typescript
- prices: Price[] // All pricing records
- loading: boolean
```

**Methods**:
```typescript
add(price: Partial<Price>): Promise<void>
update(id: string, updates: Partial<Price>): Promise<void>
remove(id: string): Promise<void>
getPriceForItem(
  cropId: string | null,
  blendId: string | null,
  packagingSize: number,
  customerType: 'domestic' | 'gastro' | 'wholesale'
): number | null
```

**Returns**:
```typescript
{
  prices: Price[]
  loading: boolean
  add: (price) => Promise<void>
  update: (id, updates) => Promise<void>
  remove: (id) => Promise<void>
  getPriceForItem: (cropId, blendId, size, type) => number | null
}
```

**Supabase Tables**:
- **Read/Write**: `prices`

**Implementation**:
```typescript
const getPriceForItem = (cropId, blendId, packagingSize, customerType) => {
  const price = prices.find(p =>
    (cropId && p.crop_id === cropId || blendId && p.blend_id === blendId) &&
    p.packaging_size === packagingSize &&
    p.customer_type === customerType
  )

  return price?.unit_price || null
}
```

---

### 4. useDeliveryDays (`src/hooks/useDeliveryDays.tsx`)

**Purpose**: Delivery days configuration

**Methods**:
```typescript
getDeliveryDaysArray(): number[] // Returns [0, 1, 3, 5] (Sun, Mon, Wed, Fri)
saveDeliveryDays(days: number[]): Promise<void>
```

**Returns**:
```typescript
{
  getDeliveryDaysArray: () => number[]
  saveDeliveryDays: (days: number[]) => Promise<void>
  loading: boolean
}
```

**Supabase Tables**:
- **Read/Write**: `delivery_days_settings`, `profiles`

**Implementation**:
```typescript
const getDeliveryDaysArray = () => {
  const { data: settings } = await supabase
    .from('delivery_days_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const days = []
  if (settings?.sunday) days.push(0)
  if (settings?.monday) days.push(1)
  if (settings?.tuesday) days.push(2)
  // ... etc

  return days
}

const saveDeliveryDays = async (days: number[]) => {
  await supabase
    .from('delivery_days_settings')
    .upsert({
      user_id: userId,
      sunday: days.includes(0),
      monday: days.includes(1),
      tuesday: days.includes(2),
      wednesday: days.includes(3),
      thursday: days.includes(4),
      friday: days.includes(5),
      saturday: days.includes(6),
    })
}
```

---

### 5. useHarvestDays (`src/hooks/useHarvestDays.ts`)

**Purpose**: Calculate harvest dates from delivery dates

**State**:
```typescript
- harvestDaysBefore: number // Days before delivery to harvest (default: 1)
```

**Methods**:
```typescript
getHarvestDateForDelivery(deliveryDate: Date): Date
setHarvestDaysBefore(days: number): Promise<void>
```

**Returns**:
```typescript
{
  getHarvestDateForDelivery: (deliveryDate: Date) => Date
  harvestDaysBefore: number
  setHarvestDaysBefore: (days: number) => Promise<void>
}
```

**Supabase Tables**:
- **Read/Write**: `profiles` (harvest_days_before_delivery)

**Implementation**:
```typescript
const getHarvestDateForDelivery = (deliveryDate: Date): Date => {
  return subDays(deliveryDate, harvestDaysBefore)
}

const setHarvestDaysBefore = async (days: number) => {
  await supabase
    .from('profiles')
    .update({ harvest_days_before_delivery: days })
    .eq('user_id', userId)

  setHarvestDaysBefore(days)
}
```

---

### 6. useVATSettings (`src/hooks/useVATSettings.tsx`)

**Purpose**: Global VAT percentage management

**State**:
```typescript
- vatPercentage: number // Global VAT rate (e.g., 20)
- loading: boolean
```

**Methods**:
```typescript
updateVAT(percentage: number): Promise<void>
```

**Returns**:
```typescript
{
  vatPercentage: number
  updateVAT: (percentage: number) => Promise<void>
  loading: boolean
}
```

**Supabase Tables**:
- **Read/Write**: `global_vat_settings`

**Implementation**:
```typescript
useEffect(() => {
  const fetchVAT = async () => {
    const { data } = await supabase
      .from('global_vat_settings')
      .select('vat_percentage')
      .maybeSingle()

    setVatPercentage(data?.vat_percentage || 20)
  }

  fetchVAT()
}, [])

const updateVAT = async (percentage: number) => {
  await supabase
    .from('global_vat_settings')
    .upsert({ vat_percentage: percentage })

  setVatPercentage(percentage)
  toast({ title: 'Success', description: 'VAT updated' })
}
```

---

### 7. usePackagingMappings (`src/hooks/usePackagingMappings.tsx`)

**Purpose**: Crop-to-packaging weight mappings

**State**:
```typescript
- mappings: PackagingMapping[] // All mappings
- loading: boolean
```

**Methods**:
```typescript
add(mapping: Partial<PackagingMapping>): Promise<void>
update(id: string, updates: Partial<PackagingMapping>): Promise<void>
remove(id: string): Promise<void>
getMappingForCrop(cropId: string, packagingId: string): PackagingMapping | null
```

**Returns**:
```typescript
{
  mappings: PackagingMapping[]
  loading: boolean
  add: (mapping) => Promise<void>
  update: (id, updates) => Promise<void>
  remove: (id) => Promise<void>
  getMappingForCrop: (cropId, packagingId) => PackagingMapping | null
}
```

**Supabase Tables**:
- **Read/Write**: `packaging_mappings`

---

### 8. useWorkerPermissions (`src/hooks/useWorkerPermissions.tsx`)

**Purpose**: Worker role permissions management

**Methods**:
```typescript
getPermissions(userId: string): Promise<WorkerPermissions>
updatePermissions(userId: string, permissions: WorkerPermissions): Promise<void>
```

**Returns**:
```typescript
{
  getPermissions: (userId) => Promise<WorkerPermissions>
  updatePermissions: (userId, permissions) => Promise<void>
  loading: boolean
}
```

**Supabase Tables**:
- **Read/Write**: `user_roles`, `profiles`

---

### 9. useInventoryConsumption (`src/hooks/useInventoryConsumption.tsx`)

**Purpose**: Track and calculate inventory consumption

**Methods**:
```typescript
calculateSeedConsumption(
  cropId: string,
  startDate: Date,
  endDate: Date
): Promise<{ totalGrams: number, byLot: Map<string, number> }>

calculatePackagingConsumption(
  packagingId: string,
  startDate: Date,
  endDate: Date
): Promise<{ totalUsed: number, byOrder: Map<string, number> }>
```

**Returns**:
```typescript
{
  calculateSeedConsumption: (cropId, start, end) => Promise<ConsumptionData>
  calculatePackagingConsumption: (packagingId, start, end) => Promise<ConsumptionData>
  loading: boolean
}
```

**Supabase Tables**:
- **Read**: `seeds`, `packagings`, `planting_plans`, `orders`, `order_items`

**Implementation**:
```typescript
const calculateSeedConsumption = async (cropId, startDate, endDate) => {
  // Fetch planting plans for crop in date range
  const { data: plans } = await supabase
    .from('planting_plans')
    .select('total_seed_grams, seed_id')
    .eq('crop_id', cropId)
    .gte('sow_date', startDate)
    .lte('sow_date', endDate)

  const totalGrams = plans.reduce((sum, plan) => sum + plan.total_seed_grams, 0)

  const byLot = new Map()
  plans.forEach(plan => {
    if (plan.seed_id) {
      byLot.set(plan.seed_id, (byLot.get(plan.seed_id) || 0) + plan.total_seed_grams)
    }
  })

  return { totalGrams, byLot }
}
```

---

### 10. useIsMobile (`src/hooks/use-mobile.tsx`)

**Purpose**: Detect mobile viewport

**Returns**:
```typescript
boolean // true if viewport width < 768px
```

**Implementation**:
```typescript
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
```

---

### 11. usePullToRefresh (`src/hooks/usePullToRefresh.tsx`)

**Purpose**: Pull-to-refresh gesture for mobile

**Props**:
```typescript
onRefresh: () => Promise<void>
```

**Returns**:
```typescript
{
  isPulling: boolean
  pullDistance: number
  handlers: {
    onTouchStart: (e) => void
    onTouchMove: (e) => void
    onTouchEnd: (e) => void
  }
}
```

**Usage**:
```tsx
const { isPulling, pullDistance, handlers } = usePullToRefresh(async () => {
  await refetch()
})

return (
  <div {...handlers}>
    {isPulling && <PullIndicator distance={pullDistance} />}
    {content}
  </div>
)
```

---

### 12. use-toast (`src/hooks/use-toast.ts`)

**Purpose**: Toast notification system

**Methods**:
```typescript
toast(options: {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}): void

dismiss(toastId?: string): void
```

**Returns**:
```typescript
{
  toast: (options) => void
  toasts: Toast[]
  dismiss: (id?) => void
}
```

**Usage**:
```tsx
toast({
  title: 'Success',
  description: 'Order created successfully',
  variant: 'default',
  duration: 3000
})

toast({
  title: 'Error',
  description: error.message,
  variant: 'destructive'
})
```

---

## Complete Database Schema

### Core Tables

#### 1. products (Crops)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  variety TEXT,
  category TEXT CHECK (category IN ('microgreens', 'microherbs', 'edible_flowers')),
  sku_prefix TEXT,
  days_to_harvest INTEGER NOT NULL,
  days_to_germination INTEGER,
  germination_type TEXT CHECK (germination_type IN ('warm', 'cold')),
  needs_weight BOOLEAN DEFAULT false,
  days_in_darkness INTEGER DEFAULT 0,
  days_on_light INTEGER NOT NULL,
  seed_density NUMERIC(10,2), -- grams per tray (default)
  expected_yield NUMERIC(10,2), -- grams per tray (default)
  seed_soaking BOOLEAN DEFAULT false,
  soaking_duration_hours INTEGER,
  can_be_cut BOOLEAN DEFAULT true,
  can_be_live BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#10b981',
  notes TEXT,
  tray_configs JSONB, -- { XL: {seed_density, expected_yield}, L: {...}, M: {...}, S: {...} }
  safety_buffer_percent NUMERIC(5,2) DEFAULT 10,
  default_substrate_type TEXT CHECK (default_substrate_type IN ('coconut', 'peat', 'other')),
  default_substrate_note TEXT,
  harvest_order INTEGER, -- Order in harvest list
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_category ON products(category);
```

**RLS Policies**:
```sql
-- Users can view all crops
CREATE POLICY "Users can view own crops"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert crops
CREATE POLICY "Users can insert own crops"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own crops
CREATE POLICY "Users can update own crops"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can delete crops
CREATE POLICY "Admins can delete crops"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

---

#### 2. customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('domestic', 'gastro', 'wholesale')),
  company_name TEXT,
  contact_name TEXT,
  ico TEXT, -- Company ID (Czech/Slovak)
  dic TEXT, -- Tax ID
  ic_dph TEXT, -- VAT ID
  bank_account TEXT,
  delivery_route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL,
  delivery_day_ids INTEGER[], -- Array of day numbers (0-6)
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer')),
  free_delivery BOOLEAN DEFAULT false,
  default_packaging_type TEXT CHECK (default_packaging_type IN ('disposable', 'returnable')),
  delivery_notes TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_route ON customers(delivery_route_id);
```

**RLS Policies**: Similar to products (SELECT, INSERT, UPDATE for authenticated, DELETE for admin)

---

#### 3. suppliers
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  supplier_type TEXT CHECK (supplier_type IN ('seeds', 'packaging', 'substrate', 'other')),
  email TEXT,
  phone TEXT,
  address TEXT,
  ico TEXT,
  dic TEXT,
  ic_dph TEXT,
  bank_account TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_suppliers_type ON suppliers(supplier_type);
```

---

#### 4. orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT, -- Denormalized for performance
  customer_type TEXT CHECK (customer_type IN ('domestic', 'gastro', 'wholesale')),
  delivery_date DATE NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('cakajuca', 'pestovanie', 'pripravena', 'dorucena', 'zrusena')),
  -- Recurring order fields
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('single', 'weekly', 'biweekly')),
  recurring_weeks INTEGER, -- Duration of recurrence
  recurring_days INTEGER[], -- Array of day numbers (0-6)
  parent_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  recurring_order_id UUID, -- Group ID for recurring instances
  skipped BOOLEAN DEFAULT false,
  -- Delivery fields
  delivery_route_id UUID REFERENCES delivery_routes(id) ON DELETE SET NULL,
  route TEXT, -- Denormalized route name
  charge_delivery BOOLEAN DEFAULT true,
  delivery_price NUMERIC(10,2) DEFAULT 0,
  -- Order totals
  total_price NUMERIC(10,2) DEFAULT 0,
  order_number TEXT, -- Human-readable order number
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_recurring_order_id ON orders(recurring_order_id);
```

---

#### 5. order_items (v2.0 Schema)
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES products(id) ON DELETE SET NULL,
  crop_name TEXT, -- Denormalized
  blend_id UUID REFERENCES blends(id) ON DELETE SET NULL,
  quantity NUMERIC(10,2) NOT NULL, -- in grams or pieces
  unit TEXT CHECK (unit IN ('g', 'kg', 'ks')),
  -- Packaging fields (v2.0 renamed columns)
  package_type TEXT CHECK (package_type IN ('disposable', 'returnable', 'none')), -- Was: packaging_type
  package_ml INTEGER CHECK (package_ml IN (250, 500, 750, 1000, 1200)), -- Was: packaging_volume_ml
  delivery_form TEXT CHECK (delivery_form IN ('cut', 'live')),
  has_label_req BOOLEAN DEFAULT false, -- Was: has_label
  special_requirements TEXT,
  -- Special items (non-crop items like substrate, packaging)
  is_special_item BOOLEAN DEFAULT false,
  custom_crop_name TEXT, -- For special items
  -- Pricing
  price_per_unit NUMERIC(10,2), -- Price per gram/kg/piece
  total_price NUMERIC(10,2), -- Total item price
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_crop_id ON order_items(crop_id);
CREATE INDEX idx_order_items_blend_id ON order_items(blend_id);
```

**Column Naming Update (v2.0)**:
- `packaging_type` → `package_type`
- `packaging_volume_ml` → `package_ml`
- `has_label` → `has_label_req`

---

#### 6. planting_plans
```sql
CREATE TABLE planting_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- DEPRECATED: Use source_orders
  source_orders UUID[], -- Array of source order IDs
  sow_date DATE NOT NULL,
  expected_harvest_date DATE NOT NULL,
  actual_harvest_date DATE,
  tray_size TEXT CHECK (tray_size IN ('XL', 'L', 'M', 'S')),
  tray_count INTEGER NOT NULL,
  seed_amount_grams NUMERIC(10,2), -- Seed density per tray
  total_seed_grams NUMERIC(10,2), -- tray_count × seed_amount_grams
  status TEXT NOT NULL CHECK (status IN ('planned', 'sown', 'growing', 'harvested')),
  seed_id UUID REFERENCES seeds(id) ON DELETE SET NULL, -- Specific seed lot used
  substrate_type TEXT CHECK (substrate_type IN ('coconut', 'peat', 'other')),
  substrate_note TEXT,
  safety_buffer_percent NUMERIC(5,2) DEFAULT 10,
  count_as_production BOOLEAN DEFAULT true, -- Count in production stats
  -- Mixed planting support
  is_mixed BOOLEAN DEFAULT false,
  mix_configuration JSONB, -- [{ crop_id, crop_name, percentage }, ...]
  -- Test planting
  is_test BOOLEAN DEFAULT false,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planting_plans_user_id ON planting_plans(user_id);
CREATE INDEX idx_planting_plans_crop_id ON planting_plans(crop_id);
CREATE INDEX idx_planting_plans_sow_date ON planting_plans(sow_date);
CREATE INDEX idx_planting_plans_harvest_date ON planting_plans(expected_harvest_date);
CREATE INDEX idx_planting_plans_status ON planting_plans(status);
```

---

#### 7. blends
```sql
CREATE TABLE blends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  crop_ids UUID[], -- Array of crop UUIDs
  crop_percentages JSONB, -- { "crop_id_1": 50, "crop_id_2": 50 }
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blends_user_id ON blends(user_id);
```

---

#### 8. seeds
```sql
CREATE TABLE seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT CHECK (unit IN ('g', 'kg')),
  lot_number TEXT,
  purchase_date DATE,
  expiry_date DATE,
  stocking_date DATE DEFAULT CURRENT_DATE,
  consumption_start_date DATE,
  consumption_end_date DATE,
  finished_date DATE, -- When lot is finished
  certificate_url TEXT, -- Base64 PDF or URL
  notes TEXT,
  min_stock NUMERIC(10,2), -- Minimum stock alert threshold
  price_per_unit NUMERIC(10,2),
  vat_percentage NUMERIC(5,2),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seeds_user_id ON seeds(user_id);
CREATE INDEX idx_seeds_crop_id ON seeds(crop_id);
```

---

#### 9. packagings
```sql
CREATE TABLE packagings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- Description
  size TEXT,
  packaging_type TEXT CHECK (packaging_type IN ('disposable', 'returnable')),
  packaging_size_ml INTEGER CHECK (packaging_size_ml IN (250, 500, 750, 1000, 1200)),
  quantity INTEGER NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  min_stock INTEGER,
  price_per_unit NUMERIC(10,2),
  vat_percentage NUMERIC(5,2),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packagings_user_id ON packagings(user_id);
CREATE INDEX idx_packagings_size_ml ON packagings(packaging_size_ml);
```

---

#### 10. substrates
```sql
CREATE TABLE substrates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('coconut', 'peat', 'other')),
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT CHECK (unit IN ('l', 'kg')),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  min_stock NUMERIC(10,2),
  price_per_unit NUMERIC(10,2),
  vat_percentage NUMERIC(5,2),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_substrates_user_id ON substrates(user_id);
```

---

#### 11. labels
```sql
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 12. consumable_inventory
```sql
CREATE TABLE consumable_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  min_stock NUMERIC(10,2),
  price_per_unit NUMERIC(10,2),
  price_includes_vat BOOLEAN DEFAULT false,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 13. other_inventory
```sql
CREATE TABLE other_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 14. delivery_routes
```sql
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  stops JSONB, -- [{ address, customer_id, order }]
  notes TEXT,
  delivery_day_id INTEGER, -- Day of week (0-6)
  -- Delivery fees by customer type
  delivery_fee_home NUMERIC(10,2) DEFAULT 0,
  delivery_fee_gastro NUMERIC(10,2) DEFAULT 0,
  delivery_fee_wholesale NUMERIC(10,2) DEFAULT 0,
  -- Minimum order value for free delivery
  home_min_free_delivery NUMERIC(10,2) DEFAULT 0,
  gastro_min_free_delivery NUMERIC(10,2) DEFAULT 0,
  wholesale_min_free_delivery NUMERIC(10,2) DEFAULT 0,
  -- Capacity limits
  max_deliveries_per_day INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_routes_user_id ON delivery_routes(user_id);
```

---

#### 15. prices
```sql
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES products(id) ON DELETE CASCADE,
  blend_id UUID REFERENCES blends(id) ON DELETE CASCADE,
  packaging_size INTEGER CHECK (packaging_size IN (250, 500, 750, 1000, 1200)),
  unit_price NUMERIC(10,2) NOT NULL, -- Price per gram or piece
  customer_type TEXT CHECK (customer_type IN ('domestic', 'gastro', 'wholesale')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT prices_crop_or_blend CHECK (
    (crop_id IS NOT NULL AND blend_id IS NULL) OR
    (crop_id IS NULL AND blend_id IS NOT NULL)
  ),
  UNIQUE (crop_id, blend_id, packaging_size, customer_type)
);

CREATE INDEX idx_prices_user_id ON prices(user_id);
CREATE INDEX idx_prices_crop_id ON prices(crop_id);
CREATE INDEX idx_prices_blend_id ON prices(blend_id);
```

---

#### 16. packaging_mappings
```sql
CREATE TABLE packaging_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES products(id) ON DELETE CASCADE,
  blend_id UUID REFERENCES blends(id) ON DELETE CASCADE,
  packaging_id UUID REFERENCES packagings(id) ON DELETE CASCADE,
  weight_g NUMERIC(10,2) NOT NULL, -- Weight in grams for this packaging size
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT packaging_mappings_crop_or_blend CHECK (
    (crop_id IS NOT NULL AND blend_id IS NULL) OR
    (crop_id IS NULL AND blend_id IS NOT NULL)
  )
);

CREATE INDEX idx_packaging_mappings_crop_id ON packaging_mappings(crop_id);
CREATE INDEX idx_packaging_mappings_blend_id ON packaging_mappings(blend_id);
```

---

### Cost Tracking Tables

#### 17. fuel_costs
```sql
CREATE TABLE fuel_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  liters NUMERIC(10,2) NOT NULL,
  price_per_liter NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 18. adblue_costs
```sql
CREATE TABLE adblue_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  liters NUMERIC(10,2) NOT NULL,
  price_per_liter NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 19. electricity_costs
```sql
CREATE TABLE electricity_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  kwh NUMERIC(10,2) NOT NULL,
  price_per_kwh NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 20. water_costs
```sql
CREATE TABLE water_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  cubic_meters NUMERIC(10,2) NOT NULL,
  price_per_m3 NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 21. car_service_costs
```sql
CREATE TABLE car_service_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  service_type TEXT,
  description TEXT,
  cost NUMERIC(10,2) NOT NULL,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 22. other_costs
```sql
CREATE TABLE other_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  vat_percentage NUMERIC(5,2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Settings Tables

#### 23. profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  sidebar_items_order JSONB, -- Custom sidebar menu order
  harvest_days_before_delivery INTEGER DEFAULT 1, -- Days before delivery to harvest
  delivery_settings JSONB, -- Custom delivery settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

---

#### 24. user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

---

#### 25. global_vat_settings
```sql
CREATE TABLE global_vat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_percentage NUMERIC(5,2) NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row
CREATE UNIQUE INDEX idx_global_vat_settings_singleton ON global_vat_settings ((id IS NOT NULL));
```

---

#### 26. delivery_days_settings
```sql
CREATE TABLE delivery_days_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  monday BOOLEAN DEFAULT false,
  tuesday BOOLEAN DEFAULT false,
  wednesday BOOLEAN DEFAULT false,
  thursday BOOLEAN DEFAULT false,
  friday BOOLEAN DEFAULT false,
  saturday BOOLEAN DEFAULT false,
  sunday BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
```

---

#### 27. login_history
```sql
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_time ON login_history(login_time DESC);
```

---

### RPC Functions

#### 1. create_order_item_with_packaging
**Purpose**: Insert order item and decrement packaging stock atomically

**Parameters**:
```sql
p_order_id UUID,
p_crop_id UUID,
p_crop_name TEXT,
p_blend_id UUID,
p_quantity NUMERIC,
p_unit TEXT,
p_package_type TEXT,
p_package_ml INTEGER,
p_delivery_form TEXT,
p_has_label_req BOOLEAN,
p_special_requirements TEXT,
p_is_special_item BOOLEAN,
p_custom_crop_name TEXT,
p_price_per_unit NUMERIC,
p_total_price NUMERIC,
p_notes TEXT
```

**Returns**: `order_items` record

---

#### 2. decrement_packaging_stock
**Purpose**: Decrement packaging inventory

**Parameters**:
```sql
p_packaging_id UUID,
p_quantity INTEGER
```

**Returns**: `void`

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION decrement_packaging_stock(
  p_packaging_id UUID,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE packagings
  SET quantity = quantity - p_quantity
  WHERE id = p_packaging_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Packaging not found: %', p_packaging_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 3. generate_planting_plan
**Purpose**: Auto-generate planting plans from orders

**Parameters**:
```sql
p_start_date DATE,
p_end_date DATE,
p_include_test BOOLEAN
```

**Returns**: `TABLE (crop_id UUID, crop_name TEXT, tray_count INTEGER, sow_date DATE, harvest_date DATE)`

**Logic**:
1. Fetch orders in date range (status != delivered/cancelled)
2. Group order_items by crop_id/blend_id + delivery_date
3. Calculate harvest_date = delivery_date - harvest_days_before_delivery
4. Calculate sow_date = harvest_date - days_to_harvest
5. Calculate total quantity needed
6. Calculate trays needed = quantity / expected_yield
7. Apply safety buffer: trays × (1 + safety_buffer_percent / 100)
8. Check if planting plan already exists
9. Insert new planting plans
10. Return summary

---

#### 4. calculate_order_total_price
**Purpose**: Calculate total order price (items + delivery fee)

**Parameters**:
```sql
p_order_id UUID
```

**Returns**: `NUMERIC`

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION calculate_order_total_price(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_items_total NUMERIC := 0;
  v_delivery_fee NUMERIC := 0;
  v_total NUMERIC := 0;
BEGIN
  -- Sum order items
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_items_total
  FROM order_items
  WHERE order_id = p_order_id;

  -- Get delivery fee
  SELECT COALESCE(delivery_price, 0)
  INTO v_delivery_fee
  FROM orders
  WHERE id = p_order_id;

  v_total := v_items_total + v_delivery_fee;

  -- Update order total
  UPDATE orders
  SET total_price = v_total
  WHERE id = p_order_id;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### 5. admin_create_user_v3
**Purpose**: Admin function to create new user accounts

**Parameters**:
```sql
p_email TEXT,
p_password TEXT,
p_full_name TEXT,
p_role TEXT
```

**Returns**: `UUID` (new user ID)

---

#### 6. admin_delete_user
**Purpose**: Admin function to delete user accounts

**Parameters**:
```sql
p_user_id UUID
```

**Returns**: `VOID`

---

### Triggers

#### 1. Auto-populate user_id
**Purpose**: Automatically set user_id on insert

**Trigger Function**:
```sql
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all tables with user_id column
CREATE TRIGGER set_user_id_trigger
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Repeat for: customers, suppliers, orders, planting_plans, etc.
```

---

#### 2. Update updated_at timestamp
**Purpose**: Automatically update updated_at on row changes

**Trigger Function**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at column
CREATE TRIGGER update_updated_at_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Repeat for: customers, orders, planting_plans, etc.
```

---

#### 3. Calculate order total on order_items change
**Purpose**: Recalculate order total_price when items change

**Trigger Function**:
```sql
CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_order_total_price(
    COALESCE(NEW.order_id, OLD.order_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER recalculate_order_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total();
```

---

## All Supabase Queries

### Products (Crops) Queries

```typescript
// Fetch all crops
const { data: crops } = await supabase
  .from('products')
  .select('*')
  .order('name')

// Fetch single crop
const { data: crop } = await supabase
  .from('products')
  .select('*')
  .eq('id', cropId)
  .maybeSingle()

// Fetch crops by category
const { data: crops } = await supabase
  .from('products')
  .select('*')
  .eq('category', 'microgreens')
  .order('name')

// Search crops
const { data: crops } = await supabase
  .from('products')
  .select('*')
  .or(`name.ilike.%${query}%,variety.ilike.%${query}%`)
  .order('name')

// Insert crop
const { data, error } = await supabase
  .from('products')
  .insert({
    name,
    variety,
    category,
    days_to_harvest,
    days_to_germination,
    germination_type,
    needs_weight,
    days_in_darkness,
    days_on_light,
    seed_density,
    expected_yield,
    seed_soaking,
    soaking_duration_hours,
    can_be_cut,
    can_be_live,
    color,
    notes,
    tray_configs: {
      XL: { seed_density: 120, expected_yield: 100 },
      L: { seed_density: 100, expected_yield: 80 },
      M: { seed_density: 80, expected_yield: 60 },
      S: { seed_density: 60, expected_yield: 40 }
    },
    safety_buffer_percent: 10,
    default_substrate_type: 'coconut',
    default_substrate_note: '',
    sku_prefix: '',
    harvest_order: 0
  })
  .select()
  .single()

// Update crop
const { error } = await supabase
  .from('products')
  .update({
    name,
    variety,
    // ... other fields
  })
  .eq('id', cropId)

// Delete crop
const { error } = await supabase
  .from('products')
  .delete()
  .eq('id', cropId)
```

---

### Customers Queries

```typescript
// Fetch all customers
const { data: customers } = await supabase
  .from('customers')
  .select('*, delivery_routes(*)')
  .order('name')

// Fetch by type
const { data: customers } = await supabase
  .from('customers')
  .select('*, delivery_routes(*)')
  .eq('customer_type', 'gastro')
  .order('name')

// Fetch by route
const { data: customers } = await supabase
  .from('customers')
  .select('*, delivery_routes(*)')
  .eq('delivery_route_id', routeId)
  .order('name')

// Search customers
const { data: customers } = await supabase
  .from('customers')
  .select('*, delivery_routes(*)')
  .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
  .order('name')

// Insert customer
const { data, error } = await supabase
  .from('customers')
  .insert({
    name,
    customer_type,
    email,
    phone,
    address,
    company_name,
    contact_name,
    ico,
    dic,
    ic_dph,
    bank_account,
    delivery_route_id,
    delivery_day_ids: [1, 3, 5], // Mon, Wed, Fri
    payment_method: 'bank_transfer',
    free_delivery: false,
    default_packaging_type: 'disposable',
    delivery_notes: '',
    notes: ''
  })
  .select()
  .single()

// Update customer
const { error } = await supabase
  .from('customers')
  .update({ ...updates })
  .eq('id', customerId)

// Delete customer
const { error } = await supabase
  .from('customers')
  .delete()
  .eq('id', customerId)
```

---

### Orders Queries

```typescript
// Fetch orders with customer info
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*), delivery_routes(*)')
  .gte('delivery_date', startDate)
  .lte('delivery_date', endDate)
  .order('delivery_date', { ascending: false })

// Fetch by status
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*)')
  .eq('status', 'cakajuca')
  .order('delivery_date')

// Fetch by customer
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*)')
  .eq('customer_id', customerId)
  .order('delivery_date', { ascending: false })

// Fetch recurring order instances
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*)')
  .eq('recurring_order_id', recurringOrderId)
  .order('delivery_date')

// Fetch orders for today
const { data: orders } = await supabase
  .from('orders')
  .select('*, customers(*), order_items(*, products(*), blends(*))')
  .eq('delivery_date', today)
  .order('customer_name')

// Insert order
const { data: order, error } = await supabase
  .from('orders')
  .insert({
    customer_id,
    customer_name,
    customer_type,
    delivery_date,
    order_date: new Date().toISOString().split('T')[0],
    status: 'cakajuca',
    is_recurring: false,
    delivery_route_id,
    route,
    charge_delivery: true,
    delivery_price: 5.00,
    total_price: 0, // Will be calculated
    order_number: generateOrderNumber(),
    notes: ''
  })
  .select()
  .single()

// Insert recurring order instances
const instances = generateRecurringInstances(orderData, recurringWeeks, recurringDays)
const { data: orders, error } = await supabase
  .from('orders')
  .insert(instances)
  .select()

// Update order
const { error } = await supabase
  .from('orders')
  .update({
    status: 'pripravena',
    // ... other updates
  })
  .eq('id', orderId)

// Update recurring order instances (all future)
const { error } = await supabase
  .from('orders')
  .update({ ...updates })
  .eq('recurring_order_id', recurringOrderId)
  .gte('delivery_date', currentDate)

// Skip recurring instance
const { error } = await supabase
  .from('orders')
  .update({ skipped: true })
  .eq('id', orderId)

// Delete recurring instances (all future)
const { error } = await supabase
  .from('orders')
  .delete()
  .eq('recurring_order_id', recurringOrderId)
  .gte('delivery_date', currentDate)
```

---

### Order Items Queries

```typescript
// Fetch order items
const { data: items } = await supabase
  .from('order_items')
  .select('*, products(*), blends(*)')
  .eq('order_id', orderId)

// Insert order item (v2.0 schema)
const { data, error } = await supabase
  .from('order_items')
  .insert({
    order_id,
    crop_id,
    crop_name,
    blend_id,
    quantity,
    unit: 'g',
    package_type: 'disposable', // v2.0 column name
    package_ml: 500, // v2.0 column name
    delivery_form: 'cut',
    has_label_req: true, // v2.0 column name
    special_requirements: '',
    is_special_item: false,
    custom_crop_name: null,
    price_per_unit: 0.10,
    total_price: quantity * 0.10,
    notes: ''
  })
  .select()
  .single()

// Insert using RPC (with packaging deduction)
const { data, error } = await supabase.rpc('create_order_item_with_packaging', {
  p_order_id: orderId,
  p_crop_id: cropId,
  p_crop_name: cropName,
  p_blend_id: null,
  p_quantity: 100,
  p_unit: 'g',
  p_package_type: 'disposable',
  p_package_ml: 500,
  p_delivery_form: 'cut',
  p_has_label_req: true,
  p_special_requirements: '',
  p_is_special_item: false,
  p_custom_crop_name: null,
  p_price_per_unit: 0.10,
  p_total_price: 10.00,
  p_notes: ''
})

// Update order item
const { error } = await supabase
  .from('order_items')
  .update({
    quantity: 150,
    total_price: 15.00
  })
  .eq('id', itemId)

// Delete order item
const { error } = await supabase
  .from('order_items')
  .delete()
  .eq('id', itemId)
```

---

### Planting Plans Queries

```typescript
// Fetch planting plans
const { data: plans } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .gte('expected_harvest_date', startDate)
  .lte('expected_harvest_date', endDate)
  .order('sow_date', { ascending: false })

// Fetch by status
const { data: plans } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .eq('status', 'growing')
  .order('expected_harvest_date')

// Fetch by crop
const { data: plans } = await supabase
  .from('planting_plans')
  .select('*')
  .eq('crop_id', cropId)
  .order('sow_date', { ascending: false })

// Fetch for today's tasks
const { data: soakingTasks } = await supabase
  .from('planting_plans')
  .select('*, products!inner(*)')
  .eq('status', 'planned')
  .eq('products.seed_soaking', true)
  .lte('sow_date', sevenDaysFromNow)

const { data: sowingTasks } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .eq('status', 'planned')
  .eq('sow_date', today)

const { data: harvestTasks } = await supabase
  .from('planting_plans')
  .select('*, products(*)')
  .eq('status', 'growing')
  .eq('expected_harvest_date', today)

// Insert planting plan
const { data, error } = await supabase
  .from('planting_plans')
  .insert({
    crop_id,
    source_orders: [orderId1, orderId2],
    sow_date,
    expected_harvest_date,
    tray_size: 'L',
    tray_count: 10,
    seed_amount_grams: 100,
    total_seed_grams: 1000,
    status: 'planned',
    seed_id: null,
    substrate_type: 'coconut',
    substrate_note: '',
    safety_buffer_percent: 10,
    count_as_production: true,
    is_mixed: false,
    mix_configuration: null,
    is_test: false,
    notes: ''
  })
  .select()
  .single()

// Insert mixed planting plan
const { data, error } = await supabase
  .from('planting_plans')
  .insert({
    crop_id: null, // Mixed planting has no single crop_id
    source_orders: [orderId],
    sow_date,
    expected_harvest_date,
    tray_size: 'L',
    tray_count: 10,
    seed_amount_grams: 90, // Weighted average
    total_seed_grams: 900,
    status: 'planned',
    is_mixed: true,
    mix_configuration: [
      { crop_id: 'uuid1', crop_name: 'Sunflower', percentage: 50 },
      { crop_id: 'uuid2', crop_name: 'Radish', percentage: 50 }
    ],
    count_as_production: true,
    is_test: false,
    notes: ''
  })
  .select()
  .single()

// Update plan status
const { error } = await supabase
  .from('planting_plans')
  .update({ status: 'sown' })
  .eq('id', planId)

// Update actual harvest date
const { error } = await supabase
  .from('planting_plans')
  .update({
    status: 'harvested',
    actual_harvest_date: new Date().toISOString().split('T')[0]
  })
  .eq('id', planId)

// Delete plan
const { error } = await supabase
  .from('planting_plans')
  .delete()
  .eq('id', planId)

// Auto-generate planting plans (RPC)
const { data, error } = await supabase.rpc('generate_planting_plan', {
  p_start_date: startDate,
  p_end_date: endDate,
  p_include_test: false
})
```

---

### Prices Queries

```typescript
// Fetch all prices
const { data: prices } = await supabase
  .from('prices')
  .select('*, products(name), blends(name)')
  .order('crop_id')

// Fetch price for specific item
const { data: price } = await supabase
  .from('prices')
  .select('unit_price')
  .eq(cropId ? 'crop_id' : 'blend_id', cropId || blendId)
  .eq('packaging_size', 500)
  .eq('customer_type', 'gastro')
  .maybeSingle()

// Insert/Update price (upsert)
const { error } = await supabase
  .from('prices')
  .upsert({
    crop_id: cropId,
    blend_id: null,
    packaging_size: 500,
    customer_type: 'gastro',
    unit_price: 0.12
  }, {
    onConflict: 'crop_id,blend_id,packaging_size,customer_type'
  })

// Delete price
const { error } = await supabase
  .from('prices')
  .delete()
  .eq('id', priceId)

// Bulk update (apply percentage increase)
const updates = prices.map(price => ({
  ...price,
  unit_price: price.unit_price * 1.10 // 10% increase
}))

const { error } = await supabase
  .from('prices')
  .upsert(updates)
```

---

### Inventory Queries

```typescript
// Seeds
const { data: seeds } = await supabase
  .from('seeds')
  .select('*, products(name), suppliers(name)')
  .order('created_at', { ascending: false })

// Low stock seeds
const { data: lowSeeds } = await supabase
  .from('seeds')
  .select('*, products(name)')
  .lt('quantity', 'min_stock')

// Packaging
const { data: packagings } = await supabase
  .from('packagings')
  .select('*, suppliers(name)')
  .order('packaging_size_ml')

// Substrates
const { data: substrates } = await supabase
  .from('substrates')
  .select('*, suppliers(name)')
  .order('name')

// Insert seed
const { data, error } = await supabase
  .from('seeds')
  .insert({
    crop_id,
    supplier_id,
    quantity: 1000,
    unit: 'g',
    lot_number: 'LOT-2026-001',
    purchase_date,
    expiry_date,
    stocking_date: new Date().toISOString().split('T')[0],
    certificate_url: base64PDF,
    min_stock: 200,
    price_per_unit: 0.05,
    vat_percentage: 20,
    notes: ''
  })
  .select()
  .single()

// Decrement packaging stock (RPC)
const { error } = await supabase.rpc('decrement_packaging_stock', {
  p_packaging_id: packagingId,
  p_quantity: 5
})
```

---

### Delivery Routes Queries

```typescript
// Fetch all routes
const { data: routes } = await supabase
  .from('delivery_routes')
  .select('*')
  .order('name')

// Fetch route with customers
const { data: route } = await supabase
  .from('delivery_routes')
  .select('*, customers(*)')
  .eq('id', routeId)
  .maybeSingle()

// Insert route
const { data, error } = await supabase
  .from('delivery_routes')
  .insert({
    name: 'Route 1',
    region: 'Bratislava',
    stops: [],
    delivery_day_id: 1, // Monday
    delivery_fee_home: 5.00,
    delivery_fee_gastro: 10.00,
    delivery_fee_wholesale: 15.00,
    home_min_free_delivery: 50.00,
    gastro_min_free_delivery: 100.00,
    wholesale_min_free_delivery: 200.00,
    max_deliveries_per_day: 20,
    notes: ''
  })
  .select()
  .single()

// Update route
const { error } = await supabase
  .from('delivery_routes')
  .update({
    stops: [
      { address: 'Street 1', customer_id: 'uuid1', order: 1 },
      { address: 'Street 2', customer_id: 'uuid2', order: 2 }
    ]
  })
  .eq('id', routeId)

// Delete route
const { error } = await supabase
  .from('delivery_routes')
  .delete()
  .eq('id', routeId)
```

---

### Settings Queries

```typescript
// Fetch VAT settings
const { data: vatSettings } = await supabase
  .from('global_vat_settings')
  .select('vat_percentage')
  .maybeSingle()

// Update VAT
const { error } = await supabase
  .from('global_vat_settings')
  .upsert({ vat_percentage: 20 })

// Fetch delivery days settings
const { data: deliveryDays } = await supabase
  .from('delivery_days_settings')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle()

// Update delivery days
const { error } = await supabase
  .from('delivery_days_settings')
  .upsert({
    user_id: userId,
    monday: true,
    tuesday: false,
    wednesday: true,
    thursday: false,
    friday: true,
    saturday: false,
    sunday: false
  })

// Fetch profile settings
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle()

// Update harvest days setting
const { error } = await supabase
  .from('profiles')
  .update({ harvest_days_before_delivery: 2 })
  .eq('user_id', userId)

// Update sidebar order
const { error } = await supabase
  .from('profiles')
  .update({
    sidebar_items_order: [
      { id: 'dashboard', order: 1 },
      { id: 'orders', order: 2 },
      // ... etc
    ]
  })
  .eq('user_id', userId)
```

---

### Auth Queries

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName
    }
  }
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Sign out
const { error } = await supabase.auth.signOut()

// Reset password
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`
})

// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Fetch user role
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .maybeSingle()

// Track login (via Edge Function)
await supabase.functions.invoke('track-login', {
  body: { user_id: userId }
})

// Fetch login history
const { data: history } = await supabase
  .from('login_history')
  .select('*')
  .eq('user_id', userId)
  .order('login_time', { ascending: false })
  .limit(20)

// Enable 2FA
const { data: { id: factorId, qr_code } } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
})

// Verify 2FA
const { data, error } = await supabase.auth.mfa.challengeAndVerify({
  factorId,
  code: '123456'
})
```

---

### Cost Tracking Queries

```typescript
// Fuel costs
const { data: fuelCosts } = await supabase
  .from('fuel_costs')
  .select('*')
  .gte('date', startDate)
  .lte('date', endDate)
  .order('date', { ascending: false })

// Insert fuel cost
const { data, error } = await supabase
  .from('fuel_costs')
  .insert({
    date,
    liters: 50,
    price_per_liter: 1.50,
    total_cost: 75.00,
    vat_percentage: 20,
    notes: ''
  })
  .select()
  .single()

// Similar patterns for: adblue_costs, electricity_costs, water_costs, car_service_costs, other_costs
```

---

## Business Logic

### 1. Order Workflow

**Complete Order Lifecycle**:
```
1. CREATE ORDER
   - Status: 'cakajuca' (pending)
   - Customer selects crop/blend, quantity, packaging, delivery date
   - System fetches price from prices table
   - System calculates delivery fee (see Delivery Fee Logic)
   - System calculates total_price = items_total + delivery_fee

2. GENERATE PLANTING PLAN
   - Manual: User creates planting plan
   - Auto: System generates from orders (see Auto-Generation Logic)
   - Status: 'planned'

3. SOW SEEDS
   - Worker marks planting plan as 'sown'
   - Status: 'planned' → 'sown'
   - System optionally records seed_id (specific lot)

4. GERMINATION & GROWTH
   - Worker monitors growth
   - Optional: Mark as 'growing'
   - Status: 'sown' → 'growing'

5. HARVEST
   - Worker harvests crop on expected_harvest_date
   - Marks planting plan as 'harvested'
   - Records actual_harvest_date
   - Status: 'growing' → 'harvested'
   - Order Status: 'cakajuca' → 'pestovanie' (growing)

6. PACK ORDER
   - Worker packs order items
   - System decrements packaging stock (RPC: decrement_packaging_stock)
   - Order Status: 'pestovanie' → 'pripravena' (ready)

7. DELIVER
   - Driver delivers order
   - Marks order as 'dorucena' (delivered)
   - Status: 'pripravena' → 'dorucena'

8. CANCELLED (if needed)
   - User cancels order
   - Status: any → 'zrusena' (cancelled)
```

---

### 2. Recurring Orders Logic

**Recurrence Types**:
- **Single**: One-time order (is_recurring = false)
- **Weekly**: Every week on selected days
- **Biweekly**: Every 2 weeks on selected days

**Recurring Order Creation**:
```typescript
// Example: Weekly recurring order for 8 weeks, every Monday and Wednesday
const recurringOrderId = generateUUID() // Group ID

const instances = []
const startDate = deliveryDate
const endDate = addWeeks(startDate, 8)
const recurringDays = [1, 3] // Monday, Wednesday

for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
  const dayOfWeek = date.getDay()

  if (recurringDays.includes(dayOfWeek)) {
    instances.push({
      ...orderData,
      delivery_date: date,
      is_recurring: true,
      recurrence_pattern: 'weekly',
      recurring_weeks: 8,
      recurring_days: [1, 3],
      recurring_order_id: recurringOrderId,
      parent_order_id: instances.length === 0 ? null : instances[0].id
    })
  }
}

// Insert all instances
await supabase.from('orders').insert(instances)
```

**Edit Recurring Order**:
```typescript
// Option 1: Edit single instance
await supabase
  .from('orders')
  .update({ ...updates })
  .eq('id', orderId)

// Option 2: Edit all future instances
await supabase
  .from('orders')
  .update({ ...updates })
  .eq('recurring_order_id', recurringOrderId)
  .gte('delivery_date', currentDate)
```

**Delete Recurring Order**:
```typescript
// Option 1: Skip single instance
await supabase
  .from('orders')
  .update({ skipped: true })
  .eq('id', orderId)

// Option 2: Delete all future instances
await supabase
  .from('orders')
  .delete()
  .eq('recurring_order_id', recurringOrderId)
  .gte('delivery_date', currentDate)
```

**Extend Recurring Order**:
```typescript
// Extend by X additional weeks
const lastDeliveryDate = getLastDeliveryDate(recurringOrderId)
const additionalInstances = generateRecurringInstances(
  orderData,
  lastDeliveryDate,
  additionalWeeks,
  recurringDays
)

await supabase
  .from('orders')
  .insert(additionalInstances)
```

---

### 3. Delivery Fee Calculation

**Priority Order** (highest to lowest):
```typescript
function calculateDeliveryFee(order: Order, customer: Customer, route: DeliveryRoute): number {
  // Priority 1: Free Delivery Toggle
  if (customer.free_delivery || order.free_delivery_manual) {
    return 0
  }

  // Priority 2: Manual Override
  if (order.manual_delivery_amount !== null) {
    return order.manual_delivery_amount
  }

  // Priority 3: Auto-calculate from Route
  if (!order.charge_delivery) {
    return 0
  }

  if (!route) {
    return 0
  }

  // Get fee based on customer type
  const feeField = `delivery_fee_${customer.customer_type}` // home/gastro/wholesale
  const minField = `${customer.customer_type}_min_free_delivery`

  const deliveryFee = route[feeField] || 0
  const minForFree = route[minField] || 0

  // Calculate items total
  const itemsTotal = order.order_items.reduce((sum, item) => sum + item.total_price, 0)

  // If order total >= minimum for free delivery, fee = 0
  if (itemsTotal >= minForFree) {
    return 0
  }

  return deliveryFee
}
```

**Example**:
```typescript
// Customer: Gastro
// Route: delivery_fee_gastro = 10.00, gastro_min_free_delivery = 100.00
// Order items total: 120.00

// Result: Delivery fee = 0 (because 120.00 >= 100.00)

// If order items total: 80.00
// Result: Delivery fee = 10.00 (because 80.00 < 100.00)
```

---

### 4. Pricing System

**Price Lookup**:
```typescript
function getPriceForItem(
  cropId: string | null,
  blendId: string | null,
  packagingSize: number,
  customerType: 'domestic' | 'gastro' | 'wholesale'
): number | null {
  const price = await supabase
    .from('prices')
    .select('unit_price')
    .eq(cropId ? 'crop_id' : 'blend_id', cropId || blendId)
    .eq('packaging_size', packagingSize)
    .eq('customer_type', customerType)
    .maybeSingle()

  return price?.unit_price || null
}
```

**Calculate Item Total**:
```typescript
function calculateItemTotal(
  quantity: number, // in grams
  pricePerGram: number
): number {
  return quantity * pricePerGram
}

// Example: 100g @ 0.10€/g = 10.00€
```

**Calculate Order Total**:
```typescript
function calculateOrderTotal(order: Order): number {
  const itemsTotal = order.order_items.reduce((sum, item) => {
    return sum + item.total_price
  }, 0)

  const deliveryFee = order.delivery_price || 0

  return itemsTotal + deliveryFee
}
```

---

### 5. Harvest/Planting Planning

**Auto-Generate Planting Plans** (Pseudocode):
```typescript
async function autoGeneratePlantingPlans(startDate: Date, endDate: Date) {
  // 1. Fetch active orders in date range
  const orders = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate)
    .neq('status', 'dorucena')
    .neq('status', 'zrusena')

  // 2. Group order items by crop_id + delivery_date
  const groups = new Map<string, {
    crop_id: string,
    delivery_date: Date,
    total_quantity: number,
    source_orders: string[]
  }>()

  for (const order of orders) {
    for (const item of order.order_items) {
      if (!item.crop_id) continue // Skip blends

      const key = `${item.crop_id}_${order.delivery_date}`

      if (!groups.has(key)) {
        groups.set(key, {
          crop_id: item.crop_id,
          delivery_date: order.delivery_date,
          total_quantity: 0,
          source_orders: []
        })
      }

      const group = groups.get(key)!
      group.total_quantity += item.quantity
      if (!group.source_orders.includes(order.id)) {
        group.source_orders.push(order.id)
      }
    }
  }

  // 3. For each group, calculate planting plan
  const plans = []

  for (const group of groups.values()) {
    const crop = await supabase
      .from('products')
      .select('*')
      .eq('id', group.crop_id)
      .single()

    // Calculate harvest date
    const harvestDate = subDays(group.delivery_date, harvestDaysBefore)

    // Calculate sow date
    const sowDate = subDays(harvestDate, crop.days_to_harvest)

    // Calculate trays needed
    const defaultTraySize = 'L'
    const expectedYield = crop.tray_configs[defaultTraySize].expected_yield
    const traysNeeded = Math.ceil(group.total_quantity / expectedYield)

    // Apply safety buffer
    const safetyBuffer = crop.safety_buffer_percent || 10
    const traysWithBuffer = Math.ceil(traysNeeded * (1 + safetyBuffer / 100))

    // Calculate seed amount
    const seedDensity = crop.tray_configs[defaultTraySize].seed_density
    const totalSeedGrams = traysWithBuffer * seedDensity

    // Check if planting plan already exists
    const existingPlan = await supabase
      .from('planting_plans')
      .select('id')
      .eq('crop_id', crop.id)
      .eq('sow_date', sowDate)
      .maybeSingle()

    if (existingPlan) {
      // Update existing plan
      await supabase
        .from('planting_plans')
        .update({
          tray_count: traysWithBuffer,
          total_seed_grams: totalSeedGrams,
          source_orders: group.source_orders
        })
        .eq('id', existingPlan.id)
    } else {
      // Create new plan
      plans.push({
        crop_id: crop.id,
        source_orders: group.source_orders,
        sow_date: sowDate,
        expected_harvest_date: harvestDate,
        tray_size: defaultTraySize,
        tray_count: traysWithBuffer,
        seed_amount_grams: seedDensity,
        total_seed_grams: totalSeedGrams,
        status: 'planned',
        substrate_type: crop.default_substrate_type,
        substrate_note: crop.default_substrate_note,
        safety_buffer_percent: safetyBuffer,
        count_as_production: true,
        is_mixed: false,
        is_test: false,
        notes: `Auto-generated for ${group.source_orders.length} orders`
      })
    }
  }

  // 4. Insert new plans
  if (plans.length > 0) {
    await supabase
      .from('planting_plans')
      .insert(plans)
  }

  return plans
}
```

---

### 6. Capacity Checking

**Harvest Capacity Calculator** (7-day forecast):
```typescript
async function calculateHarvestCapacity(startDate: Date, endDate: Date) {
  // 1. Fetch planting plans in date range
  const plans = await supabase
    .from('planting_plans')
    .select('*, products(*)')
    .eq('status', 'growing')
    .gte('expected_harvest_date', startDate)
    .lte('expected_harvest_date', endDate)

  // 2. Fetch orders in date range
  const orders = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate)
    .neq('status', 'zrusena')

  // 3. Group by crop_id + harvest_date + packaging_size
  const capacityMap = new Map<string, {
    crop_id: string,
    crop_name: string,
    harvest_date: Date,
    packaging_size: number,
    available_capacity: number, // grams
    ordered_quantity: number, // grams
    deficit: number, // grams (negative if surplus)
  }>()

  // 4. Calculate available capacity from planting plans
  for (const plan of plans) {
    const expectedYield = plan.products.tray_configs[plan.tray_size]?.expected_yield || plan.products.expected_yield
    const capacity = plan.tray_count * expectedYield

    // Group by packaging sizes (250, 500, 750, 1000, 1200)
    for (const size of [250, 500, 750, 1000, 1200]) {
      const key = `${plan.crop_id}_${plan.expected_harvest_date}_${size}`

      if (!capacityMap.has(key)) {
        capacityMap.set(key, {
          crop_id: plan.crop_id,
          crop_name: plan.products.name,
          harvest_date: plan.expected_harvest_date,
          packaging_size: size,
          available_capacity: 0,
          ordered_quantity: 0,
          deficit: 0
        })
      }

      capacityMap.get(key)!.available_capacity += capacity
    }
  }

  // 5. Calculate ordered quantity from orders
  for (const order of orders) {
    const harvestDate = subDays(order.delivery_date, harvestDaysBefore)

    for (const item of order.order_items) {
      if (!item.crop_id) continue

      const key = `${item.crop_id}_${harvestDate}_${item.package_ml}`

      if (!capacityMap.has(key)) {
        // No capacity planned for this crop/date/size
        capacityMap.set(key, {
          crop_id: item.crop_id,
          crop_name: item.crop_name,
          harvest_date: harvestDate,
          packaging_size: item.package_ml,
          available_capacity: 0,
          ordered_quantity: 0,
          deficit: 0
        })
      }

      capacityMap.get(key)!.ordered_quantity += item.quantity
    }
  }

  // 6. Calculate deficit/surplus
  for (const entry of capacityMap.values()) {
    entry.deficit = entry.ordered_quantity - entry.available_capacity
  }

  // 7. Return sorted by deficit (highest first)
  return Array.from(capacityMap.values())
    .sort((a, b) => b.deficit - a.deficit)
}
```

**Capacity Status Colors**:
```typescript
function getCapacityStatus(deficit: number) {
  if (deficit > 0) {
    return 'red' // Deficit (not enough capacity)
  } else if (deficit > -50) {
    return 'yellow' // Tight (capacity close to demand)
  } else {
    return 'green' // Surplus (plenty of capacity)
  }
}
```

---

### 7. Delivery Days Logic

**Delivery Days Configuration**:
- Stored in `delivery_days_settings` table (per user)
- Boolean fields: monday, tuesday, wednesday, thursday, friday, saturday, sunday
- Used to highlight available delivery days in calendar

**Get Delivery Days Array**:
```typescript
function getDeliveryDaysArray(settings: DeliveryDaysSettings): number[] {
  const days = []
  if (settings.sunday) days.push(0)
  if (settings.monday) days.push(1)
  if (settings.tuesday) days.push(2)
  if (settings.wednesday) days.push(3)
  if (settings.thursday) days.push(4)
  if (settings.friday) days.push(5)
  if (settings.saturday) days.push(6)
  return days
}
```

**Check if Date is Delivery Day**:
```typescript
function isDeliveryDay(date: Date, deliveryDays: number[]): boolean {
  const dayOfWeek = date.getDay()
  return deliveryDays.includes(dayOfWeek)
}
```

---

### 8. Packing Workflow

**Packing Checklist**:
```typescript
// 1. Fetch orders for today
const orders = await supabase
  .from('orders')
  .select('*, customers(*), order_items(*, products(*))')
  .eq('delivery_date', today)
  .eq('status', 'pestovanie')

// 2. For each order, create packing checklist
for (const order of orders) {
  console.log(`Order #${order.order_number} - ${order.customer_name}`)

  for (const item of order.order_items) {
    console.log(`  - ${item.crop_name} ${item.quantity}g in ${item.package_ml}ml ${item.package_type}`)
    console.log(`    Label: ${item.has_label_req ? 'Yes' : 'No'}`)
    console.log(`    Delivery form: ${item.delivery_form}`)

    // Decrement packaging stock
    if (item.package_type !== 'none') {
      const packaging = await supabase
        .from('packagings')
        .select('id')
        .eq('packaging_size_ml', item.package_ml)
        .eq('packaging_type', item.package_type)
        .maybeSingle()

      if (packaging) {
        await supabase.rpc('decrement_packaging_stock', {
          p_packaging_id: packaging.id,
          p_quantity: 1 // 1 container per item
        })
      }
    }
  }

  // 3. Mark order as ready
  await supabase
    .from('orders')
    .update({ status: 'pripravena' })
    .eq('id', order.id)
}
```

---

### 9. Soaking Reminders

**Calculate Soaking Time**:
```typescript
// For each planting plan with seed_soaking = true
function calculateSoakingTime(sowDate: Date, soakingDurationHours: number): Date {
  return subHours(sowDate, soakingDurationHours)
}

// Example: Sow on 2026-03-15 10:00, soak for 8 hours
// Soaking time: 2026-03-15 02:00
```

**Get Soaking Reminders for Today**:
```typescript
async function getSoakingReminders() {
  const now = new Date()
  const sevenDaysFromNow = addDays(now, 7)

  // Fetch planting plans with seed soaking
  const plans = await supabase
    .from('planting_plans')
    .select('*, products!inner(*)')
    .eq('status', 'planned')
    .eq('products.seed_soaking', true)
    .lte('sow_date', sevenDaysFromNow)

  // Filter by soaking time = today
  const reminders = plans.filter(plan => {
    const soakTime = calculateSoakingTime(
      plan.sow_date,
      plan.products.soaking_duration_hours
    )
    return isToday(soakTime)
  })

  return reminders
}
```

---

## Settings and Configuration

### 1. Global VAT Settings
**Table**: `global_vat_settings`

**Fields**:
- `vat_percentage` - Global VAT rate (e.g., 20%)

**Usage**:
- Applied to all prices and costs
- Used in reports and invoicing
- Can be overridden per item if needed

---

### 2. Delivery Days Configuration
**Table**: `delivery_days_settings`

**Fields** (per user):
- `monday` - boolean
- `tuesday` - boolean
- `wednesday` - boolean
- `thursday` - boolean
- `friday` - boolean
- `saturday` - boolean
- `sunday` - boolean

**Usage**:
- Defines which days are available for delivery
- Used in calendar to highlight delivery days
- Used in recurring order generation

---

### 3. Harvest Days Setting
**Table**: `profiles`
**Field**: `harvest_days_before_delivery`

**Default**: 1 day

**Usage**:
- Defines how many days before delivery to harvest
- Formula: `harvest_date = delivery_date - harvest_days_before_delivery`
- Used in planting plan generation

---

### 4. Delivery Route Settings
**Table**: `delivery_routes`

**Fields per route**:
- `name` - Route name
- `region` - Geographic region
- `stops` - JSONB array of stops
- `delivery_day_id` - Day of week (0-6)
- `delivery_fee_home` - Fee for home customers
- `delivery_fee_gastro` - Fee for gastro customers
- `delivery_fee_wholesale` - Fee for wholesale customers
- `home_min_free_delivery` - Minimum for free delivery (home)
- `gastro_min_free_delivery` - Minimum for free delivery (gastro)
- `wholesale_min_free_delivery` - Minimum for free delivery (wholesale)
- `max_deliveries_per_day` - Capacity limit

**Usage**:
- Used in delivery fee calculation
- Used in delivery route planning
- Used to assign customers to routes

---

### 5. Sidebar Menu Customization
**Table**: `profiles`
**Field**: `sidebar_items_order` - JSONB

**Structure**:
```json
[
  { "id": "dashboard", "label": "Dashboard", "order": 1, "visible": true },
  { "id": "orders", "label": "Objednávky", "order": 2, "visible": true },
  { "id": "crops", "label": "Plodiny", "order": 3, "visible": true },
  ...
]
```

**Usage**:
- Allows users to customize sidebar menu order
- Show/hide menu items
- Stored per user

---

### 6. Packaging Materials Configuration
**Table**: `packagings`

**Standard Sizes** (packaging_size_ml):
- 250ml
- 500ml
- 750ml
- 1000ml
- 1200ml

**Types** (packaging_type):
- `disposable` - Single-use containers
- `returnable` - Reusable containers

**Usage**:
- Inventory tracking
- Order item packaging selection
- Packaging stock deduction

---

### 7. Worker Permissions
**Table**: `user_roles`
**Field**: `role` - 'admin' | 'worker'

**Permissions by Role**:

**Admin**:
- Full access to all features
- User management
- Delete operations
- System settings
- Role assignment

**Worker**:
- View all data (orders, customers, crops, etc.)
- Create/edit orders
- Create/edit planting plans
- Update planting status
- Pack orders
- View reports
- **Cannot**: Delete records, manage users, change settings

**Custom Worker Permissions** (future feature):
- Granular permissions per page/feature
- Stored in `profiles` table or separate `worker_permissions` table

---

## User Roles and Permissions

### 1. User Types

#### Admin Role
**Capabilities**:
- Full CRUD on all data
- User management (create, edit, delete users)
- Role assignment
- System settings configuration
- Delete operations
- Cost tracking
- Reports and analytics
- All worker capabilities

**RLS Policies**:
```sql
-- Admins can delete records
CREATE POLICY "Admins can delete"
  ON table_name FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

---

#### Worker Role
**Capabilities**:
- View all data (orders, customers, crops, inventory, etc.)
- Create/edit orders
- Create/edit planting plans
- Update planting status (planned → sown → growing → harvested)
- Pack orders (mark as ready)
- View reports
- Add/edit inventory items
- Add/edit customers
- Add/edit crops

**Restrictions**:
- Cannot delete records (except own created items)
- Cannot manage users
- Cannot change system settings
- Cannot assign roles
- Cannot access admin-only pages

**RLS Policies**:
```sql
-- Workers can view all data
CREATE POLICY "Workers can view"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Workers can insert
CREATE POLICY "Workers can insert"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Workers can update own data
CREATE POLICY "Workers can update"
  ON table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2. Authentication System

**Supabase Auth**:
- Email/password authentication
- Session management
- Password reset via email
- Optional 2FA (TOTP)

**Login Flow**:
```typescript
1. User enters email and password
2. Call supabase.auth.signInWithPassword({ email, password })
3. If 2FA enabled:
   - Supabase returns { factors: [...] }
   - User enters 6-digit code
   - Call supabase.auth.mfa.challengeAndVerify({ factorId, code })
4. If successful:
   - Session created
   - User redirected to dashboard
   - Login tracked in login_history table (via Edge Function)
5. Fetch user role from user_roles table
6. Store role in React context
```

**Session Management**:
```typescript
// Check session on app load
useEffect(() => {
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    setUser(session.user)
    const role = await fetchUserRole(session.user.id)
    setUserRole(role)
  }
}, [])

// Listen for auth changes
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      setUser(session.user)
      fetchUserRole(session.user.id).then(setUserRole)
    } else if (event === 'SIGNED_OUT') {
      setUser(null)
      setUserRole(null)
    }
  })

  return () => subscription.unsubscribe()
}, [])
```

---

### 3. Two-Factor Authentication (2FA)

**Setup Flow**:
```typescript
1. User navigates to Settings → Security → Enable 2FA
2. Call supabase.auth.mfa.enroll({ factorType: 'totp' })
3. Supabase returns:
   - factorId
   - qr_code (URI for authenticator app)
   - secret (manual entry)
4. Display QR code to user
5. User scans with authenticator app (Google Authenticator, Authy, etc.)
6. User enters test code
7. Call supabase.auth.mfa.challengeAndVerify({ factorId, code })
8. If verified, 2FA is enabled
```

**Login with 2FA**:
```typescript
1. User enters email and password
2. Call supabase.auth.signInWithPassword({ email, password })
3. If 2FA enabled, Supabase returns:
   - { factors: [{ id, type: 'totp', ... }] }
4. User enters 6-digit code from authenticator app
5. Call supabase.auth.mfa.challengeAndVerify({
     factorId: factors[0].id,
     code: userCode
   })
6. If verified, login completes
```

**Disable 2FA**:
```typescript
1. User navigates to Settings → Security → Disable 2FA
2. Call supabase.auth.mfa.unenroll({ factorId })
3. 2FA is disabled
```

---

### 4. Login History Tracking

**Table**: `login_history`

**Tracked Data**:
- `user_id` - User ID
- `login_time` - Timestamp
- `ip_address` - IP address (if available)
- `user_agent` - Browser/device info

**Tracking Implementation** (via Edge Function):
```typescript
// Edge Function: track-login
Deno.serve(async (req) => {
  const { user_id } = await req.json()

  const ip_address = req.headers.get('x-forwarded-for') || 'unknown'
  const user_agent = req.headers.get('user-agent') || 'unknown'

  await supabase
    .from('login_history')
    .insert({
      user_id,
      login_time: new Date().toISOString(),
      ip_address,
      user_agent
    })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## Integrations

### 1. Supabase

**Services Used**:
- **Database**: PostgreSQL with RLS
- **Auth**: Email/password + 2FA (TOTP)
- **Realtime**: Database subscriptions for live updates
- **Edge Functions**: Serverless functions for custom logic
- **Storage**: (Not currently used, but available for file uploads)

**Configuration** (`.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Client Initialization**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### 2. External Services

**None currently integrated**

**Potential Future Integrations**:
- **Stripe**: Payment processing (if selling online)
- **Twilio**: SMS notifications for delivery updates
- **Google Maps API**: Route optimization
- **SendGrid**: Email notifications
- **Sentry**: Error tracking
- **Google Analytics**: Usage analytics

---

### 3. Edge Functions

**Deployed Functions**:

1. **ping** - Health check
2. **test-hello** - Test function
3. **track-login** - Track login events
4. **delete-user** - Admin function to delete users
5. **migrate-data** - Data migration utility
6. **fix-order-delivery-fees** - Fix delivery fee calculation

**Usage**:
```typescript
// Call Edge Function
const { data, error } = await supabase.functions.invoke('track-login', {
  body: { user_id: userId }
})
```

---

## Development Guidelines

### 1. Code Organization

**File Structure Best Practices**:
- **Pages**: One page per route, organized by feature
- **Components**: Reusable UI components in `src/components/`
- **Hooks**: Custom hooks in `src/hooks/`
- **Types**: Centralized types in `src/types/index.ts`
- **Utils**: Utility functions in `src/lib/utils.ts`

**Component Organization**:
```
src/components/
├── ui/              # Shadcn/ui components (low-level)
├── layout/          # Layout components
├── orders/          # Order-specific components
├── delivery/        # Delivery components
├── dashboard/       # Dashboard widgets
├── settings/        # Settings panels
├── auth/            # Auth components
└── [feature]/       # Feature-specific components
```

---

### 2. Database Migrations

**Migration File Naming**:
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

**Migration Template**:
```sql
/*
  # Migration Title

  1. Changes
    - List all changes
    - Be specific about tables, columns, indexes

  2. Security
    - List RLS policies added/modified
    - Note any permission changes

  3. Notes
    - Important considerations
    - Breaking changes
    - Migration dependencies
*/

-- SQL statements here

-- Always add RLS policies!
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Policy description"
  ON table_name
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Migration Checklist**:
- [ ] Descriptive comment block at top
- [ ] All tables have `user_id` column
- [ ] RLS enabled on all tables
- [ ] Policies for SELECT, INSERT, UPDATE, DELETE
- [ ] Indexes on foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Default values for columns
- [ ] Constraints (CHECK, UNIQUE, NOT NULL)
- [ ] Triggers if needed (updated_at, user_id auto-population)

---

### 3. Security Best Practices

**Row Level Security (RLS)**:
- Enable RLS on ALL tables
- Create policies for each operation (SELECT, INSERT, UPDATE, DELETE)
- Default deny (no policy = no access)
- Use `auth.uid()` to check user identity
- Admin-only operations use role check

**Example RLS Policies**:
```sql
-- View own data
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert own data
CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update own data
CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin delete
CREATE POLICY "Admins can delete"
  ON table_name FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
```

**Sensitive Data**:
- Never expose API keys or secrets in client code
- Use environment variables (`.env`)
- Use Edge Functions for sensitive operations
- Use Supabase service_role_key only in Edge Functions

---

### 4. Error Handling

**Pattern**:
```typescript
try {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')

  if (error) {
    console.error('Supabase error:', error)
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive'
    })
    return
  }

  // Handle success
  setData(data)
} catch (err) {
  console.error('Unexpected error:', err)
  toast({
    title: 'Error',
    description: 'An unexpected error occurred',
    variant: 'destructive'
  })
}
```

**User-Friendly Error Messages**:
- Translate technical errors to user-friendly messages
- Provide actionable feedback
- Log technical details for debugging

---

### 5. TypeScript Types

**Sync with Database**:
- Use Supabase CLI to generate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
- Regenerate after schema changes
- Import types from `src/integrations/supabase/types.ts`

**Custom Types**:
- Define in `src/types/index.ts`
- Use consistent naming conventions
- Export all types for reuse

---

### 6. Testing (Recommended)

**Unit Tests**:
- Test utility functions
- Test custom hooks
- Test business logic functions

**Integration Tests**:
- Test database queries
- Test RLS policies
- Test Edge Functions

**E2E Tests**:
- Test critical user flows (order creation, planting plan generation)
- Use Playwright or Cypress

---

### 7. Performance Optimization

**Database Queries**:
- Use indexes on frequently queried columns
- Avoid N+1 queries (use joins)
- Limit result sets
- Use pagination for large datasets

**React Performance**:
- Use `React.memo` for expensive components
- Use `useMemo` and `useCallback` for expensive calculations
- Debounce search inputs
- Lazy load pages with `React.lazy`

**Real-time Subscriptions**:
- Unsubscribe when component unmounts
- Limit subscriptions to necessary tables
- Use filters to reduce data transfer

---

## Conclusion

GrowBase is a comprehensive, production-ready microgreens farm management system with a robust architecture, extensive features, and strong security practices. The application supports the complete lifecycle of microgreens farming, from crop planning through delivery, with recurring orders, capacity management, cost tracking, and multi-language support.

**Key Strengths**:
- Multi-tenant architecture with RLS
- Comprehensive order and planting management
- Recurring order support
- Automatic planting plan generation
- Harvest capacity forecasting
- Mobile-optimized UI
- 2FA authentication
- Cost tracking across multiple categories
- Extensible design for future features

**Future Enhancement Opportunities**:
- Payment integration (Stripe)
- SMS notifications (Twilio)
- Route optimization (Google Maps)
- Advanced analytics and reports
- Mobile app (React Native)
- Barcode/QR code scanning
- API for third-party integrations
- Multi-farm support
- Inventory forecasting with ML

This technical report provides a complete reference for continuing development, onboarding new developers, or migrating the application to a new environment.

---

**Document Version**: 1.0
**Last Updated**: March 13, 2026
**Maintained By**: GrowBase Development Team
