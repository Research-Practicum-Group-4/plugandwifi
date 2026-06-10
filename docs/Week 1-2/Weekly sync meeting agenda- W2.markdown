**Weekly Sync Meeting Agenda - W2**

**Meeting Details**

- **Time:** Wednesday 12:00 PM (30 mins max)

- **Objective:** Track Sprint 1 deliverables, finalize the cross-functional API Contract, and review all artifacts required for Friday\'s official Sprint Review.

**Agenda**

**1. Status Check & Supervisor Feedback Alignment (5 mins)**

Brief review of our foundational requirements and validation of Alessio\'s previous feedback:

- **Core Requirements:** Verification of EDI, GenAI, and Business integration.

- **The \"Elevator Pitch\":** Finalizing our strict 2-sentence Novelty Statement.

- **Documentation Revisions:** Quick status check on the expanded Literature Review, Team Contract standards.

**2. Role-Specific Progress & Sprint Review Artifacts (12 mins - 2 mins per role)**

Each role will report on their **Sprint 1 Technical Scaffolding** checkpoints and the specific deliverables targeted for Friday\'s review:

- **Scrum / Integration Lead:** CI pipeline deployment (Ruff/Prettier protection), project **Burndown Chart** status, and hosting/testing plans.

- **PM / UX Lead:** **Product Backlog** prioritization, finalization of **User Stories**, **Current Product Mockups**, and Mobile Transaction Flow diagrams.

- **Backend:** Initial PostgreSQL schema deployment, Flask API routing skeleton, and architecture documentation.

- **Data / ML:** Dataset acquisition (OSM/NYC data), profiling report, cleaning pipeline, and database seed data preparation.

- **Frontend (Web):** \"Hello World\" React PoC in the monorepo, UI scaffold, and feature alignment based on the **Current Product Mockups**.

- **Frontend (Mobile):** \"Hello World\" React Native PoC running on simulator, UI scaffold, and feature alignment based on the **Current Product Mockups**.

**3. Cross-Team Collaboration & Alignment (5 mins)**

- Frontend (Web & Mobile), Data, and Backend teams will sync to cross-verify the API contract---ensuring UI query parameters (e.g., Frontend sending GPS coordinates/filters based on mockups), ML input/output scores, and database connections are fully aligned and finalized for development.

**4. Next Steps & Reminders (3 mins)**

- **Timesheet Submission Process:** Group discussion on establishing a standardized, frictionless method for everyone to log and submit individual working hours (timesheets) so the PM can seamlessly collect them and calculate budget progress.

#### 

#### **🛠️ Scrum / Integration Lead**

- \[ \] **CI Pipeline Deployment:** Is the automated pipeline (e.g., Ruff, Prettier) fully deployed and successfully protecting the develop branch?

- \[ \] **Environment Bootstrapping:** Are the local development environments reproducible, and is the Git workflow strictly followed by all members?

- \[ \] **Hosting & Deployment:** Is the preliminary hosting plan drafted to support the upcoming PostgreSQL and Flask deployments?

#### **🎯 PM / UX Lead**

- \[ \] **Scope Control:** Have you actively safeguarded the sprint scope by ensuring no user-facing functional stories are distracting the developers?

- \[ \] **Mobile Transaction Flows:** Are the core transaction flow diagrams for the mobile app finalized and ready for the engineering team to review?

- \[ \] **Business Plan:** Are the revisions from Alessio\'s feedback (realistic budget, risks, activity-based Gantt chart) completed?

#### **⚙️ Backend**

- \[ \] **Database Foundation:** Is the initial PostgreSQL schema fully finalized, reviewed, and successfully deployed to the development environment?

- \[ \] **API Skeleton:** Is the Flask API routing skeleton fully implemented (returning Mock API structures) so the frontend teams can begin connecting?

- \[ \] **Architecture Documentation:** Is the high-level system architecture clearly explained and diagrammed in the backend README.md?

#### **📊 Data / Machine Learning**

- \[ \] **Dataset Acquisition & Profiling:** Have the primary datasets (e.g., OSM POI data, NYC Open Data) been explored, with missing values and quality issues identified?

- \[ \] **Data Cleaning Pipeline:** Has a preliminary cleaning solution been tested and verified to handle the identified data inconsistencies?

- \[ \] **Seeded Datasets Preparation:** Are the final cleaned datasets successfully prepared as \"seed data\" ready to be ingested into the Backend\'s PostgreSQL database?

#### **💻 Frontend (Web)**

- \[ \] **\"Hello World\" PoC:** Is a basic \"Hello World\" React application running successfully within the monorepo to prove the build tools and local environment are functioning?

  - Sure, the Frontend startup PR has been merged, the Holle World app can run successfully in local

- \[ \] **UI Scaffold & Feature Alignment:** Is the structural routing and component scaffold built directly based on the PM\'s UI mockups? Please verify that the current application framework accommodates all required features.

  - 

- \[ \] **API Integration Readiness:** Is the scaffold ready to accept the Mock API responses defined in the Flask routing skeleton?

#### **📱 Frontend (Mobile)**

- \[ \] **\"Hello World\" PoC:** Is a basic \"Hello World\" Proof of Concept compiling and running successfully on a local mobile simulator/emulator using React Native?

- \[ \] **UI Scaffold & Feature Alignment:** Is the base routing and screen navigation built directly based on the PM\'s UI mockups? Please verify that the current application framework accommodates all required features.
