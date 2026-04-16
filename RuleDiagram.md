Dưới đây là **Bộ Quy chuẩn Thiết kế Sơ đồ Hệ thống (System Diagram Standard Rules)** dành cho thực thể AI Antigravity, được biên soạn hoàn toàn bằng Tiếng Anh chuyên ngành kỹ thuật theo đúng yêu cầu của bạn.

---

# SYSTEM DIAGRAM STANDARD RULES

**Target Entity:** Antigravity AI
**Role:** Software Architect / Technical Writer

---

## PART I: PRE-DESIGN PRINCIPLES (MANDATORY)

Before drafting any diagram, Antigravity **MUST** strictly adhere to the following pre-design steps:

* **Logic Analysis Rule:** Antigravity must perform a comprehensive "Source/Requirement Comprehension" phase. You must explicitly identify: main functions, data flow, state variables, and decision points. Do not proceed to drawing until the logic is completely parsed.
* **Scope Definition:** System Boundaries must be strictly defined to prevent over-modeling or under-modeling. Identify exact entry points (inputs) and exit points (outputs) of the scope. External entities must remain strictly outside the system boundary.

---

## PART II: TECHNICAL STANDARDS BY DIAGRAM TYPE

### 1. System Context & Data Flow Diagram (DFD - Level 0, 1, 2)

DFDs represent the flow of data using inputs, processing, and outputs.

* **Notation (DeMarco & Yourdon Standard):**
  * **External Entities:** Rectangles (Terminators, actors).
  * **Process:** Circles or rounded rectangles.
  * **Data Store:** Open-ended rectangles (databases/repositories).
  * **Data Flow:** Directed arrows.
* **Granularity:**
  * **Level 0 (Context Diagram):** The entire system is represented as a **single process** interacting with external entities.
  * **Level 1:** Explodes the main process into sub-processes. **DO NOT** show external entities again; only show data flows coming in/out matching Level 0.
  * **Level 2:** Decomposes Level 1 processes for further detail.
* **Strict Rule:** DFDs  **MUST be balanced** . A decomposed process in Level 1 must have the exact same number and labels of inputs and outputs as its parent process in Level 0.

### 2. Use Case Diagram

Visualizes the core functions a system provides to its actors.

* **Notation:** System boundary (Rectangle), Actor (Stick figure), Use Case (Horizontal Oval).
* **Connectors:**
  * `<<include>>`: Base use case points to the included use case (Mandatory step).
  * `<<extend>>`: Extending use case points to the base use case (Optional step/Condition-based).
* **Naming Convention:**
  * **RIGHT:** Start Use Cases with Verbs (e.g., `OrderCoffee`, `ViewCatalog`).
  * **WRONG:** Do not use Nouns for Use Cases (e.g., `CoffeeOrder`).
* **Granularity:** Focus only on core business processes. Avoid overly detailed sub-tasks unless explicitly requested.

### 3. Activity Diagram

Models the sequential or concurrent workflows of the system based on Use Case specifications (main flows and alternate flows).

* **Notation:**
  * **Start Node:** Solid filled circle.
  * **End Node:** Bullseye symbol (circle with a dot).
  * **Activity:** Rounded rectangle containing the activity name.
  * **Decision/Merge Node:** Diamond shape for branching logic.
* **Naming Convention:** Use clear action phrases (e.g., `Check Inventory`, `Display Error`).
* **Granularity:** Must show both the Main Flow and Alternate/Exception Flows as defined in the Use Case.

### 4. Class Diagram

Models system objects, their attributes, methods, and relationships.

* **Notation & Granularity:**
  * **High-Level (Domain Model):** 1-compartment box with only the Class Name.
  * **Low-Level (Design Model):** 3-compartment box: `Class Name`, `Attributes`, `Methods/Constructors`.
* **Access Modifiers:** Use `-` for Private, `+` for Public.
* **Naming Convention:**
  * **Class Names:** `PascalCase` (e.g., `OrderManager`).
  * **Attributes/Methods:** `camelCase` (e.g., `setPhone()`, `customerName`).
* **Multiplicity:** Must clearly define relationships (e.g., `0..1`, `1..*`) at both ends of the association line.

### 5. Entity Relationship Diagram (ERD)

Models database schema structures.

* **Notation (Chen's Notation):**
  * **Entities:** Rectangles.
  * **Attributes:** Ovals connected via lines to entities.
  * **Relationships:** Diamonds connected between entities.
* *Note: For highly technical databases, Crow's Foot notation is preferred to save canvas space.*
* **Naming Convention:** Use Singular Nouns for Entities (e.g., `Customer`, `Pet`).
* **Strict Rule:** Always determine cardinality (1-to-1, 1-to-Many marked as `1` and `N`) before drawing attributes.

### 6. Sequence Diagram

Illustrates how objects interact over time to fulfill a use case.

* **Notation (MVC-based Architecture):**
  * **Lifeline:** Object boxes with dashed vertical lines.
  * **Actor:** Initiates the sequence.
  * **Boundary:** UI/Interface forms.
  * **Control:** Processing logic/Controllers.
  * **Entity:** Database/Data classes.
* **Strict Communication Rule:** A Boundary **MUST NOT** communicate directly with an Entity. It must pass through a Control layer.
* **Messages:**
  * `Synchronous:` Solid line with a filled arrowhead (requires waiting).
  * `Asynchronous:` Solid line with an open arrowhead.
  * `Return:` Dashed line with an open arrowhead (returns processed data).
* **Fragments:** Use `alt` for if/else conditions, `opt` for single choices, and `loop` for iterations.

---

## PART III: LAYOUT & AESTHETICS

* **Flow Principles:**
  * Time-based diagrams (Activity, Sequence) **MUST** progress from  **Top-to-Bottom** .
  * Process-based diagrams (DFD, Use Case) should flow  **Left-to-Right** .
* **Spacing & Alignment (Crossing Lines):**
  * **RIGHT:** Place the most highly connected nodes (e.g., central Use Cases or Control classes) in the direct center of the canvas to minimize crossing lines.
  * **WRONG:** Placing unrelated entities between highly dependent nodes.
* **Annotations:** Attach explicit note elements (`Note`) to connector lines (e.g., `<<extend>>` arrows) to explain complex conditions or extension points that graphical notation cannot fully express.

---

## PART IV: ANTIGRAVITY QUALITY CHECKLIST

Before finalizing and rendering any diagram, Antigravity must execute the following self-audit:

| Diagram Type        | Validation Questions                                                                                                                                     |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Universal** | • Is the layout clean, with minimal overlapping lines?• Is the naming convention strictly followed (PascalCase, camelCase)?                            |
| **DFD**       | • Is the DFD completely balanced? (Do Level 1 inputs/outputs match Level 0 perfectly?)• Are external entities omitted in Level 1 and Level 2?          |
| **Use Case**  | • Are Use Cases strictly verbs and Actors strictly nouns?• Does the `<<include>>`arrow point correctly from the base to the inclusion?               |
| **Activity**  | • Does the diagram contain precisely one Start Node and at least one valid End Node?• Do all paths originating from a Decision node resolve logically? |
| **Sequence**  | • Does time progress strictly top-down?• Is the architectural layer rule respected? (Boundary does NOT bypass Control to touch Entity).                |
| **Class/ERD** | • Are multiplicities/cardinalities mapped on*both*sides of a relationship?                                                                            |
