# ATU Hostel Booking Management System (HBMS)

All diagrams below are **Mermaid**. They render in GitHub, VS Code (Markdown preview), Notion, and many slide tools. Copy any fenced `mermaid` block as needed.

---

## 1. System architecture (three layers)

```mermaid
flowchart TB
  subgraph Clients[" "]
    Browser["Browser / mobile simulator"]
  end

  subgraph Presentation["PRESENTATION LAYER"]
    direction TB
    Proxy["proxy.ts<br/>session gate · Basic Auth · CSRF cookie"]
    Routes["Next.js App Router<br/>/ · /student/* · /manager/* · /admin/*"]
    UI["React RSC + Client UI<br/>shadcn/ui · Tailwind"]
    Forms["Forms & dialogs<br/>CSRF double-submit"]
    API["Route handlers<br/>/api/* JSON"]
  end

  subgraph Business["BUSINESS LOGIC LAYER"]
    direction TB
    Actions["Server Actions<br/>auth · booking · hostel · users · admin"]
    Services["Domain services<br/>bookings · hostels · users · notifications · analytics"]
    AuthZ["Authorization<br/>requireRole · hostelScopeWhere · canManageHostel"]
    Mail["Notifications<br/>mailer · Mailtrap · in-app inbox"]
    Audit["Audit trail<br/>ActivityLog writers"]
  end

  subgraph Data["DATA LAYER"]
    direction TB
    Prisma["Prisma Client 7"]
    Adapter["@prisma/adapter-pg"]
    Neon[("Neon PostgreSQL")]
    FS["File uploads<br/>public/hostels"]
  end

  subgraph External["EXTERNAL"]
    SMTP["SMTP / Mailtrap"]
    OSM["OpenStreetMap / Leaflet"]
  end

  Browser --> Proxy
  Proxy --> Routes
  Proxy --> API
  Routes --> UI
  UI --> Forms
  Forms --> Actions
  API --> Services
  Actions --> Services
  Services --> AuthZ
  Services --> Mail
  Services --> Audit
  Services --> Prisma
  Prisma --> Adapter --> Neon
  Services --> FS
  Mail --> SMTP
  UI --> OSM

  classDef presentation fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
  classDef business fill:#dcfce7,stroke:#15803d,color:#0f172a
  classDef data fill:#fef3c7,stroke:#b45309,color:#0f172a
  class Presentation presentation
  class Business business
  class Data data
```

### Layer map

```mermaid
flowchart LR
  subgraph P["Presentation"]
    P1["src/app/**"]
    P2["src/components/**"]
    P3["src/proxy.ts"]
  end
  subgraph B["Business logic"]
    B1["src/lib/actions/**"]
    B2["src/lib/services/**"]
    B3["src/lib/scoping.ts"]
  end
  subgraph D["Data"]
    D1["prisma/schema.prisma"]
    D2["Neon DATABASE_URL"]
    D3["public/hostels"]
  end
  P --> B --> D
```

### Request flow

```mermaid
sequenceDiagram
  participant U as Browser
  participant P as proxy.ts
  participant Page as App Router
  participant A as Server Action
  participant S as Service
  participant DB as Neon

  U->>P: GET /manager/bookings
  P->>P: CSRF cookie + staff session
  P->>Page: forward
  Page->>S: list bookings scoped
  S->>DB: Prisma findMany
  DB-->>S: rows
  S-->>Page: data
  Page-->>U: HTML

  U->>A: Approve + CSRF token
  A->>A: requireCsrf + requireRole
  A->>S: approveBooking
  S->>S: canManageHostel
  S->>DB: update + audit + notify
  A-->>U: revalidate + toast
```

### Role URL prefixes

```mermaid
flowchart LR
  Login["/login"] --> S["STUDENT → /"]
  Login --> M["MANAGER → /manager"]
  Login --> A["ADMIN → /admin"]

  S --> S1["/student/bookings"]
  S --> S2["/student/profile"]
  S --> S3["/hostels/:id"]

  M --> M1["/manager/hostels"]
  M --> M2["/manager/bookings"]
  M --> M3["/manager/payments"]
  M --> M4["/manager/reports"]

  A --> A1["/admin/* shared"]
  A --> A2["/admin/users"]
  A --> A3["/admin/notifications"]
  A --> A4["/admin/activity"]
```

---

## 2. Database ER diagram

```mermaid
erDiagram
  User ||--o| Hostel : manages
  Hostel ||--|{ Room : contains
  User ||--o{ Booking : places
  Room ||--o{ Booking : reserved_as
  Booking ||--o| Payment : paid_by
  User ||--o{ ActivityLog : acts
  User ||--o{ Notification : receives
  User ||--o{ PasswordResetToken : owns

  User {
    uuid id PK
    string name
    string studentIdNumber UK
    string email UK
    string phone
    string department
    Role role
    uuid hostelId UK "manager only"
    string password
    boolean isActive
  }

  Hostel {
    uuid id PK
    string name
    string location
    HostelType type
    string facilities
    string featuredImage
    float latitude
    float longitude
    boolean isApproved
  }

  Room {
    uuid id PK
    uuid hostelId FK
    string roomNumber
    string roomType
    int capacity
    float pricePerSemester
    RoomStatus status
    string featuredImage
  }

  Booking {
    uuid id PK
    uuid userId FK
    uuid roomId FK
    string academicSession
    BookingStatus status
    float amount
    string notes
  }

  Payment {
    uuid id PK
    uuid bookingId UK
    string reference UK
    float amountPaid
    PaymentStatus status
    string method
  }

  ActivityLog {
    uuid id PK
    uuid userId FK
    string action
    string subjectType
    string subjectId
    string ipAddress
  }

  Notification {
    uuid id PK
    uuid userId FK
    string type
    string title
    string body
    string href
    string delivery
    datetime readAt
  }

  PasswordResetToken {
    uuid id PK
    uuid userId FK
    string tokenHash UK
    datetime expiresAt
  }
```

### Enums

```mermaid
flowchart TB
  Role["Role: STUDENT | MANAGER | ADMIN"]
  HostelType["HostelType: UNIVERSITY | PRIVATE"]
  RoomStatus["RoomStatus: AVAILABLE | MAINTENANCE | CLOSED"]
  BookingStatus["BookingStatus: PENDING | CONFIRMED | CANCELLED | COMPLETED"]
  PaymentStatus["PaymentStatus: PENDING | SUCCESS | FAILED"]
```

---

## 3. UI wireframes (Mermaid)

### Student catalog (`/`)

```mermaid
block-beta
  columns 1
  header["ATU header · 🔔 · theme · ☰ menu"]:1
  hero["Find your room at ATU · search · type · max price"]:1
  block:cards:1
    columns 2
    c1["Hostel card\nphoto · name · from GH₵\nView rooms"]
    c2["Hostel card\nphoto · name · from GH₵\nView rooms"]
  end
  foot["Footer: disclaimer · privacy · prospectus"]:1
```

### Student bookings (`/student/bookings`)

```mermaid
block-beta
  columns 1
  header["ATU header · 🔔 · ☰"]:1
  title["My bookings"]:1
  card["Student card fields\nHostel · Room · Session\nAmount · Status · Payment\nPay now / Receipt"]:1
```

### Manager dashboard (`/manager`)

```mermaid
block-beta
  columns 4
  nav["Sidebar\nOverview\nAnalytics\nHostels\nBookings\nPayments\nReports\nLog out"]:1
  block:main:3
    columns 1
    top["☰ HBMS Manager · 🔔"]
    shortcuts["Hostel · Bookings · Payments · Analytics"]
    kpis["KPI cards: students · rooms · pending · payments"]
    recent["Recent booking request cards"]
  end
```

### Manager bookings (`/manager/bookings`)

```mermaid
block-beta
  columns 1
  header["☰ HBMS Manager"]:1
  filters["All | PENDING | CONFIRMED · Search"]:1
  row["Student · Hostel · Room · Amount\nStatus · Payment\nReject · Approve · Verify"]:1
```

### Admin users (`/admin/users`)

```mermaid
block-beta
  columns 4
  nav["Sidebar\n…\nUsers\nNotifications\nAudit log"]:1
  block:main:3
    columns 1
    top["☰ HBMS Admin · Add user"]
    user["User card\nName · Email · Role · Status\nHostel assign · Edit · Deactivate · Delete"]
  end
```

### Role navigation flow

```mermaid
flowchart TD
  Guest["Guest /"] --> Login["/login"]
  Login --> Student["Student /"]
  Login --> Manager["Manager /manager"]
  Login --> Admin["Admin /admin"]

  Student --> Browse["Browse hostels"]
  Browse --> Detail["/hostels/:id"]
  Detail --> Book["Request booking"]
  Book --> MyBook["/student/bookings"]
  MyBook --> Pay["Pay dialog"]

  Manager --> MBook["/manager/bookings"]
  MBook --> Approve["Approve / Reject"]
  Manager --> MPay["/manager/payments"]
  MPay --> Verify["Verify payment"]

  Admin --> Users["/admin/users"]
  Admin --> Scope["All hostels · SMTP · audit"]
```

---

## 4. Security architecture

```mermaid
flowchart TB
  Client["Untrusted client"]

  subgraph Edge["EDGE · proxy.ts"]
    HTTPS["HTTPS"]
    Basic["Optional Basic Auth\n/admin · /manager"]
    CSRF_C["CSRF JWT cookie mint"]
    SessGate["Staff session gate"]
    RoleRedir["Role URL redirect\nmanager ↔ admin"]
  end

  subgraph App["APPLICATION"]
    Login["Login / register\nbcrypt verify"]
    Session["iron-session cookie\nhttpOnly · sameSite=lax · 2h"]
    RR["requireSession / requireRole"]
    CSRF_V["requireCsrf on mutations"]
    Scope["Row-level scope\nhostelScopeWhere · fail-closed"]
    Reset["Password reset\nSHA-256 token hash"]
  end

  subgraph DataSec["DATA & HARDENING"]
    DB[("Neon Postgres\nno client SQL")]
    Audit["ActivityLog append-only"]
    Secrets["Env secrets only\nSESSION_SECRET · SMTP · DB"]
    Upload["Image MIME + 10 MB cap"]
    Rate["Rate limit auth"]
  end

  Client --> HTTPS --> Basic --> CSRF_C --> SessGate --> RoleRedir
  RoleRedir --> Login
  Login --> Session
  Session --> RR
  CSRF_C --> CSRF_V
  RR --> Scope
  Scope --> DB
  Scope --> Audit
  Secrets --> Session
  Secrets --> DB
  Reset --> DB
  Rate --> Login
  Upload --> DB
```

### Controls matrix (Mermaid)

```mermaid
flowchart LR
  subgraph AuthN["Authentication"]
    a1["Email + bcrypt"]
    a2["iron-session cookie"]
    a3["Password reset hashed tokens"]
  end
  subgraph AuthZ["Authorization"]
    z1["requireRole"]
    z2["Manager one hostelId"]
    z3["canManageHostel"]
  end
  subgraph EdgeC["Edge"]
    e1["CSRF double-submit"]
    e2["Optional Basic Auth"]
    e3["/student · /manager · /admin"]
  end
  subgraph Ops["Ops"]
    o1["No demo seed in production"]
    o2["SESSION_SECRET required"]
    o3["ActivityLog audit"]
  end
```

### Trust boundaries

```mermaid
flowchart LR
  Net["Internet"] -->|TLS| Edge["Next.js proxy"]
  Edge -->|session + CSRF| App["Server Actions / RSC"]
  App -->|scoped Prisma| DB[("Neon")]
  App -->|outbound only| Mail["SMTP / Mailtrap"]
```

---

## How to use

1. Open this file in VS Code and use Markdown preview (Mermaid usually works with the built-in or a Mermaid extension).
2. Paste any ` ```mermaid ` block into [mermaid.live](https://mermaid.live) to export PNG/SVG for slides.
3. GitHub renders these blocks automatically on the repo page.
