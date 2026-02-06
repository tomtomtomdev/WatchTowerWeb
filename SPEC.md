# WatchTower - Comprehensive Specification Document

## 1. Project Purpose and Functionality

**WatchTower** is a native macOS menu bar application that provides real-time API health monitoring and status tracking. It allows users to monitor multiple API endpoints with automated health checks, visual status indicators, desktop notifications, and detailed performance analytics.

### Key Value Propositions:
- Monitor API health with minimal system resource usage
- Get instant notifications when services fail or recover
- Track response times and performance trends
- Support bulk operations on multiple endpoints
- Easy endpoint creation via cURL import or Postman collection import

---

## 2. Project Structure

```
WatchTower/
├── WatchTower/                          # Main application source
│   ├── Models/                          # Data models
│   │   ├── APIEndpoint.swift           # Core endpoint entity
│   │   ├── HealthCheckResult.swift     # Health check result entity
│   │   ├── HTTPMethod.swift            # HTTP verb enumeration
│   │   ├── EndpointStatus.swift        # Status enumeration with colors/icons
│   │   ├── PollingInterval.swift       # Check frequency options
│   │   └── ParsedCurlCommand.swift     # Parsed cURL command model
│   ├── Services/                        # Business logic & background tasks
│   │   ├── HealthCheckService.swift    # Performs HTTP health checks
│   │   ├── NetworkService.swift        # HTTP request execution
│   │   ├── SchedulerService.swift      # Background check scheduling
│   │   ├── NotificationService.swift   # Desktop notifications
│   │   ├── CurlParserService.swift     # cURL command parsing
│   │   └── PostmanParserService.swift  # Postman collection parsing
│   ├── Views/                           # UI components
│   │   ├── MainView.swift              # Main application window
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift    # Grid view of all endpoints
│   │   │   └── StatusGridItemView.swift # Individual status card
│   │   ├── Endpoints/
│   │   │   ├── EndpointListView.swift  # Sidebar endpoint list
│   │   │   ├── EndpointDetailView.swift # Detailed endpoint info & history
│   │   │   └── EndpointRowView.swift   # List item component
│   │   ├── AddEndpoint/
│   │   │   ├── AddEndpointSheet.swift  # Add endpoint modal
│   │   │   ├── CurlImportView.swift    # cURL & Postman import UI
│   │   │   └── ManualEntryView.swift   # Manual form entry
│   │   └── MenuBar/
│   │       └── MenuBarView.swift       # Menu bar dropdown interface
│   ├── Assets.xcassets                 # Images and app icons
│   ├── WatchTower.entitlements         # App sandbox & capabilities
│   └── WatchTowerApp.swift             # App entry point & initialization
├── WatchTowerTests/                     # Unit tests
├── WatchTowerUITests/                   # UI tests
└── WatchTower.xcodeproj/               # Xcode project configuration
```

---

## 3. Main Components and Their Responsibilities

### 3.1 Data Models

#### **APIEndpoint** (`Models/APIEndpoint.swift`)
- Core data model for monitoring endpoints
- **Properties**: id, name, url, method, headers, body, pollingInterval, isEnabled, lastCheckedAt, healthCheckResults
- **Computed**: currentStatus, lastResponseTime
- SwiftData model with cascade delete on health check results

#### **HealthCheckResult** (`Models/HealthCheckResult.swift`)
- Records individual health check execution results
- **Properties**: id, endpoint, timestamp, isSuccess, statusCode, responseTime, errorMessage

#### **HTTPMethod** (`Models/HTTPMethod.swift`)
- Enumeration of HTTP verbs: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

#### **EndpointStatus** (`Models/EndpointStatus.swift`)
- Health states: healthy (green), failing (red), unknown (gray), checking (orange)

#### **PollingInterval** (`Models/PollingInterval.swift`)
- Check frequencies: 5min, 15min (default), hourly, 12-hourly, daily

#### **ParsedCurlCommand** (`Models/ParsedCurlCommand.swift`)
- Parsed cURL command structure: url, method, headers, body

### 3.2 Service Layer

#### **NetworkService** (`Services/NetworkService.swift`)
- Handles all HTTP communication
- Actor type for thread safety
- 30-second timeout, automatic Content-Type for JSON

#### **HealthCheckService** (`Services/HealthCheckService.swift`)
- Orchestrates health checks and notifications
- Detects status transitions and triggers notifications
- Uses TaskGroup for concurrent endpoint checking

#### **SchedulerService** (`Services/SchedulerService.swift`)
- Manages background checking task scheduling
- Configurable inter-check delays (default 1.0 second)
- Task-based background loops

#### **NotificationService** (`Services/NotificationService.swift`)
- Manages macOS desktop notifications
- Singleton pattern
- Actionable notifications with "Check Now" and "View Details"

#### **CurlParserService** (`Services/CurlParserService.swift`)
- Parses cURL commands into structured data
- Handles multi-line commands, headers, body extraction

#### **PostmanParserService** (`Services/PostmanParserService.swift`)
- Parses Postman collection JSON exports
- Supports nested folders and multiple request formats

### 3.3 View Layer

#### **WatchTowerApp** (`WatchTowerApp.swift`)
- Application entry point
- SwiftData ModelContainer setup
- Menu bar extra with dynamic antenna icon

#### **MainView** (`Views/MainView.swift`)
- NavigationSplitView with sidebar + detail
- View mode toggle (Dashboard/List)
- Multi-selection support for bulk operations

#### **DashboardView** (`Views/Dashboard/DashboardView.swift`)
- Grid-based visualization of all endpoints
- Click interactions for selection

#### **EndpointDetailView** (`Views/Endpoints/EndpointDetailView.swift`)
- Comprehensive endpoint info and management
- Response time chart and history

#### **MenuBarView** (`Views/MenuBar/MenuBarView.swift`)
- Quick-access menu bar dropdown
- Overall status and endpoint list

#### **AddEndpointSheet** (`Views/AddEndpoint/AddEndpointSheet.swift`)
- Modal for adding endpoints
- Tabs for cURL import and manual entry

#### **CurlImportView** (`Views/AddEndpoint/CurlImportView.swift`)
- Multi-mode import: Paste, File, Postman
- Live parsing and validation

---

## 4. Technologies and Frameworks

### Core Frameworks:
- **SwiftUI** - Declarative UI
- **SwiftData** - Persistence (replaces CoreData)
- **Combine** - Reactive programming
- **Foundation** - URLSession, Date/Time, Codable
- **UserNotifications** - Desktop notifications
- **Charts** - Data visualization

### macOS-Specific:
- **AppKit** - NSApp for lifecycle
- **NSEvent** - Keyboard modifier detection

### Swift Features:
- Swift Concurrency (async/await, Task, TaskGroup, actors)
- Property Wrappers (@Published, @Query, @Environment, @State, @Bindable)

### Build Configuration:
- **macOS Target**: 14.0+ (Sonoma)
- **Xcode**: 15.0+
- **Swift**: 5.9+

---

## 5. Key Data Types

```
APIEndpoint
├── id: UUID
├── name: String
├── url: String
├── method: HTTPMethod
├── headers: [String: String]
├── body: String?
├── pollingInterval: PollingInterval
├── isEnabled: Bool
├── lastCheckedAt: Date?
├── healthCheckResults: [HealthCheckResult]
├── currentStatus: EndpointStatus (computed)
└── lastResponseTime: TimeInterval? (computed)

HealthCheckResult
├── id: UUID
├── endpoint: APIEndpoint?
├── timestamp: Date
├── isSuccess: Bool
├── statusCode: Int?
├── responseTime: TimeInterval
└── errorMessage: String?
```

---

## 6. Service Interfaces

```swift
// HealthCheckService
func performHealthCheck(for endpoint: APIEndpoint) async -> HealthCheckResult
func performHealthCheckForAll(endpoints: [APIEndpoint]) async

// SchedulerService
func startMonitoring(endpoints: [APIEndpoint])
func stopMonitoring(endpoint: APIEndpoint)
func triggerImmediateCheck(for endpoint: APIEndpoint) async
func triggerBatchHealthChecks(for endpoints: [APIEndpoint], delayBetweenChecks: TimeInterval) async

// NotificationService
func requestAuthorization() async
func sendFailureNotification(endpointName: String, errorMessage: String) async
func sendRecoveryNotification(endpointName: String) async

// Parser Services
CurlParserService.parse(_ curlCommand: String) throws -> ParsedCurlCommand
PostmanParserService.parse(_ jsonData: Data) throws -> [ParsedPostmanRequest]
```

---

## 7. Configuration Requirements

### System Requirements:
- **macOS**: 14.0 (Sonoma) or later
- **Xcode**: 15.0 or later

### App Configuration:
- **Bundle ID**: `com.tom.tom.tom.WatchTower`
- **Window Size**: Default 1000x700 pixels
- **Sandboxing**: Enabled with network.client and file read permissions

### Runtime:
- **Notifications**: Requires user permission
- **Data Storage**: SwiftData in Application Support

---

## 8. Dependencies

**No External Package Dependencies** - Uses only Apple's native frameworks:
- Foundation, SwiftUI, SwiftData, Combine, UserNotifications, Charts, AppKit

---

## 9. Architecture

### Pattern: MVVM + Services Layer

**Layers:**
1. **Models**: Data entities (SwiftData)
2. **Services**: Business logic (actors for thread safety)
3. **Views**: SwiftUI components by feature
4. **Data**: SwiftData persistence

**Key Patterns:**
- Actor Model for thread safety
- Singleton for NotificationService
- Task-based concurrency for background monitoring
- @MainActor for UI thread safety

---

## Summary

| Metric | Value |
|--------|-------|
| Swift Files | 24 |
| UI Components | 13 views |
| Services | 6 classes |
| Models | 6 types |
| External Dependencies | 0 |
| Min macOS | 14.0 |
