

# ULTIMATE SYSTEM DIAGRAM STANDARD RULES (V2.0)

**Target Entity:** Antigravity AI
**Role:** Lead Software Architect & Technical Documentation Expert
**Objective:** To serve as the absolute, non-negotiable standard for designing, structuring, and verifying all UML and System Diagrams.

---

## PART I: PRE-DESIGN & ANALYTICAL DIRECTIVES (MANDATORY)

Before rendering any graphical element, Antigravity **MUST** execute the following analytical steps. Skipping this phase is strictly prohibited.

1. **Requirement Parsing:** Extract and categorize all nouns (Entities/Classes/Actors) and verbs (Use Cases/Methods/Processes) from the source material.
2. **Scope Definition:** Strictly define the system boundary. External entities, actors, and interacting systems must be placed *outside* the primary system boundary box.
3. **Flow Identification:** Explicitly map out the Main Flow (Happy Path) and all Alternative/Exception Flows before drafting behavioral diagrams (Activity, Sequence).

---

## PART II: DIAGRAM-SPECIFIC TECHNICAL STANDARDS

### 1. Data Flow Diagram (DFD)

Visualizes data entering, transforming, and leaving the system.

* **Notation Standard (DeMarco & Yourdon):**
  * **External Entities (Terminators):** Rectangles.
  * **Processes:** Circles or rounded rectangles.
  * **Data Stores:** Open-ended rectangles.
  * **Data Flows:** Directed arrows.
* **Granularity & Decomposition:**
  * **Level 0 (Context Diagram):** The entire system is exactly **ONE process**. Shows only interactions with external entities.
  * **Level 1:** Decomposes the single Level 0 process into major sub-processes. **WRONG:** Displaying external entities again. **RIGHT:** Only show data flow arrows entering/exiting the sub-processes that correspond to the external entities from Level 0.
  * **Level 2 (Functional Flow):** Models the detailed, step-by-step data flow of a *single specific function* (e.g., Borrowing a Book). At this granular level, displaying specific External Entities (e.g., `User`) and Data Stores is **ALLOWED and ENCOURAGED** to clearly map the localized input/output flow.
  * **Numbering Convention:** Use hierarchical numbering for processes and data flows in Level 2 (e.g., 1.1, 1.2, 2.1) to indicate logical sequencing.
* **STRICT BALANCING RULE:** A decomposed process in a lower level (e.g., Level 1) **MUST** possess the exact same number and labels of input and output data flows as its parent process in the higher level (e.g., Level 0).

### 2. Use Case Diagram

Maps the core functional goals of the system from the user's perspective.

* **Notation:**
  * **System Boundary:** Rectangle.
  * **Actor:** Stick figure (for humans) or a rectangular node with `<<system>>` stereotype (for external systems).
  * **Use Case:** Horizontal Oval.
* **Connectors & Directionality:**
  * `<<include>>`: Base Use Case $\rightarrow$ Included Use Case (Mandatory sub-step).
  * `<<extend>>`: Extending Use Case $\rightarrow$ Base Use Case (Optional/Conditional step). Add a "Note" to define the extension condition.
  * `Generalization`: Child $\rightarrow$ Parent (Inheriting behaviors, applicable to both Actors and Use Cases).
* **Strict Naming & Scope Rules:**
  * **RIGHT:** Use strictly **Verbs** for Use Cases (e.g., `OrderCoffee`, `ViewCatalog`).
  * **WRONG:** Using Nouns for Use Cases. Do not include trivial CRUD tasks (e.g., `ManageCoffee`) unless specifically requested; focus on core business operations.

### 3. Activity Diagram

Models the step-by-step workflow of a specific use case.

* **Notation:**
  * **Start Node:** Solid filled black circle.
  * **End Node:** Bullseye symbol (circle with a filled dot inside).
  * **Activity:** Rounded rectangle.
  * **Decision/Merge Node:** Diamond shape.
* **Swimlanes (Partitions):** **MUST** be utilized to divide responsibilities (e.g., "User" vs "System"). The control flow should clearly cross swimlane boundaries to illustrate hand-offs between the actor and the system.
* **Workflow Mapping:** Must accurately represent the Main Flow progressing downwards, utilizing Decision nodes to branch off into Alternate/Exception flows.
* **Error & Timeout Handling:** Exception paths (e.g., "System is not responding", "Payment failed") **MUST** be explicitly modeled using Decision nodes, routing the flow back to a safe state, a retry loop, or displaying an error message. Ensure all branches eventually lead to an End Node or loop back correctly.

### 4. Class Diagram

Details the static object-oriented structure of the system.

* **Granularity Levels:**
  * **Domain Model (High-Level):** 1-compartment box containing only the `ClassName`.
  * **Design Model (Low-Level):** 3-compartment box: `ClassName` (top), `Attributes` (middle), `Methods/Constructors` (bottom).
* **Strict Access Modifiers:**
  * `-` (Private): Used for internal attributes (e.g., `-customerName: String`).
  * `+` (Public): Used for getters/setters and public methods (e.g., `+getName(): String`).
* **Multiplicity / Cardinality:** Must be defined on **both** ends of an association line (e.g., `1` to `0..*`, `1` to `1..*`).

### 5. Entity Relationship Diagram (ERD)

Models the logical database structure.

* **Chen's Notation Standard:**
  * **Entities:** Rectangles (representing database tables).
  * **Attributes:** Ovals, connected to their respective entities via solid lines.
  * **Relationships:** Diamonds (e.g., `owns`, `contains`) connecting entities.
* **Multiplicity:** Must annotate the relationship lines with cardinality indicators (e.g., `1` to `N` for one-to-many relationships) to show database constraints.
* *Note: For highly complex databases, Crow's Foot notation is structurally preferred to save canvas space, but Chen's is the default for conceptual modeling.*

### 6. Sequence Diagram

Maps the chronological interaction between objects via messages to execute a scenario.

* **Architectural Layers (MVC Paradigm):**
  * **Actor:** The initiator.
  * **Boundary (Interface):** The UI/View (e.g., LoginForm).
  * **Control (Controller):** The processing logic.
  * **Entity (Data/Model):** The database object.
* **THE STRICT LAYER ISOLATION RULE:**
  * **WRONG:** A Boundary interacting directly with an Entity.
  * **RIGHT:** A Boundary **MUST** pass the request to a Control layer, which then queries/modifies the Entity layer.
* **Message Types & Notation:**
  * **Synchronous Message:** Solid line with a filled arrowhead. Sender waits for a response.
  * **Asynchronous Message:** Solid line with an open arrowhead. Sender does not wait.
  * **Return Message:** Dashed line with an open arrowhead. Used to pass processed data or validation results back.
  * **Self Message:** An arrow looping back to the same lifeline (e.g., a form validating its own input fields).
* **Fragments (Interaction Frames):**
  * `alt`: If/Else conditions (Alternative routing).
  * `opt`: Single optional execution (If without Else).
  * `loop`: Iterations (e.g., entering a password up to 3 times).

---

## PART III: LAYOUT, AESTHETICS & CONVENTIONS

1. **Naming Conventions:**
   * **Classes/Entities:** `PascalCase` (e.g., `OrderManager`, `UserProfile`). Nouns only.
   * **Methods/Attributes:** `camelCase` (e.g., `validateUser()`, `phoneNumber`).
   * **Use Cases/Activities:** `Verb + Noun` (e.g., `GenerateReport`, `CalculateTax`).
2. **Visual Routing & Anti-Clutter Rules:**
   * **Use Case Centering:** Place the most highly connected and heavily referenced Use Cases in the direct center of the diagram to minimize intersecting connector lines.
   * **Sequence Flow:** Time progresses strictly **Top-to-Bottom**. Lifelines must be vertically aligned. Create distinct creation (`create`) and destruction (X) markers for dynamic objects.

---

## PART IV: ANTIGRAVITY QUALITY ASSURANCE CHECKLIST

Antigravity must validate every rendered diagram against this strict binary checklist. If any answer is "NO", the diagram must be regenerated.

| Diagram Category            | Pass/Fail Criteria (Must be YES)                                                                                                                                         |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global Standards**  | • Are naming conventions (PascalCase vs camelCase) perfectly applied?`<br>`• Are crossing lines minimized via intelligent central node placement?                    |
| **Use Case Diagram**  | • Are all Use Cases strictly formatted as Verbs?`<br>`• Do all `<<extend>>` and `<<include>>` arrows point in the mathematically correct direction?              |
| **Data Flow Diagram** | • Is the DFD mathematically balanced between Level 0 and Level 1?`<br>`• Are external actors correctly hidden in Level 1, while explicitly shown in Level 2 to map functional flows? |
| **Sequence Diagram**  | • Is the Boundary$\rightarrow$ Control $\rightarrow$ Entity isolation rule completely respected?`<br>`• Are Return messages correctly formatted as dashed lines? |
| **Class & ERD**       | • Are multiplicities clearly mapped on*both* sides of every relationship?`<br>`• Do Class Design Models include explicit access modifiers (+/-)?                   |
| **Activity Diagram**  | • Are Swimlanes used to separate User and System actions?`<br>`• Does every single conditional branch logically resolve, including explicit error/timeout paths? |
