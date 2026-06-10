# 1. App Overview & problem definition

Flexible space finder platform that acts as an intermediary between space users and space providers

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  What                                                                                                                                                                                                                                          Who                                                                                                                                           Why is it important
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Traditional coworking spaces are cost-prohibitive for brief stays, often forcing users to purchase full-day passes. Conversely, public alternatives like cafes and libraries cannot offer a reliable workspace that fulfils a user's needs.   Key users face significant productivity hurdles when trying to find temporary, short-term workspaces for 1 to 3-hour gaps between meetings.   Local hospitality businesses possess valuable underutilised real estate, sitting largely empty during off-peak hours. Solving this mismatch unlocks secondary monetisation channels for local urban hosts who can leverage their existing seats with minimal to zero operational burden.

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 2. Solution

The proposed platform addresses this friction by serving as an hourly marketplace for professional desk space, effectively functioning as an \"Hourly Airbnb for Work\" from the user's perspective and an "Hourly Too Good To Go for tables" from the business perspective.

The platform aims to deploy a Minimum Viable Product (MVP) prioritising core marketplace workflows:

- **Sensory & Technology Filtering:** Users can filter available seating based on critical, verified productivity indicators, including reliable Wi-Fi availability, plug access, and quietness levels.

- **Location-Based Interactive Search:** Integrates mapping features, allowing users to pinpoint nearby workspaces based on their current geographic location or a manually input destination.

- **Dynamic Micro-Booking Workflow:** Features an intuitive time-slot management tool allowing users to secure guaranteed reservations for precise 1, 2, or 3-hour durations.

- **Simulated Booking & Payment Loop:** Simplifies MVP validation by displaying instant booking details and payment solution integration (e.g., Stripe)

- **Provider Capacity Management:** Gives local business hosts a dedicated flow to register their layout, specify vacant hours, publish hourly desk offers, and manage incoming user bookings.

- **Heuristic Venue Ranking:** Incorporates a user score and comments to select the most appropriate environments matching user preferences first.

# 3. Market and Competition

## Target Users

- *Remote Professionals & Freelancers:* Individuals lacking dedicated offices who need verified environments to take urgent calls or complete focused tasks without distractions.

- *International Business Travellers:* Corporate workers or business owners and representatives navigating schedule gaps between client meetings in unfamiliar cities.

- *Students:* Learners looking for affordable, guaranteed study spaces with charging capabilities.

- *Space Providers:* Local cafes, restaurants, and hotel lobby operations seeking incremental revenue margins from empty seats during standard off-peak operational windows.

## Competitors (from Competitive Analysis)

  -----------------------------------------------------------------------------------------------------------------------------------------------
  Competitor Name         Offering/Product                                                      Key Advantage over Competitor
  ----------------------- --------------------------------------------------------------------- -------------------------------------------------
  Dayuse.com              Day Hotel booking                                                     Work-dedicated space booking

  Dis-loyalty             Premium Membership for urban dwellers to use group hotel facilities   Fulfilling critical conditions for focused work

  WeWork                  Established coworking network                                         No full-day access fees.
  -----------------------------------------------------------------------------------------------------------------------------------------------

# 4. Architecture and Technology Stack

  ------------------------------------------------------------------------------------------------------------
  Component               Technology/Framework           Rationale
  ----------------------- ------------------------------ -----------------------------------------------------
  Frontend (Mobile/Web)   React, JavaScript, HTML, CSS   Reusable, responsive UI development.

  Backend/API             Python, Flask, REST API, JWT   Lightweight API development and secure login

  Database                MySQL, SQLAlchemy ORM          Structured data storage and simpler database access

  Data & ML               Python, pandas, scikit-learn   Venue ranking and suitability prediction

  Hosting/Cloud           AWS EC2, AWS RDS for MySQL     Scalable hosting and MySQL management

  Devops                  Docker                         Containerisation for continuous deployment
  ------------------------------------------------------------------------------------------------------------

# 5. Development Plan & Risk Assessment

  -----------------------------------------------------------------------------------------------------------------------------------------------------------
  Milestone                Estimated Completion Date                     Description
  ------------------------ --------------------------------------------- ------------------------------------------------------------------------------------
  Phase 1: Feature Lock    28 May 2026 Project Planning                  Finalise core features, user journey, personas, and prototype direction.

  Phase 2: Alpha Release   5 Jun 2026 Sprint 1 Review                    Build the React/Flask/MySQL foundation with seeded venue data and APIs.

  Phase 3: Beta Release    3 Jul 2026 Sprint 2 Review + Presentation 2   Test and refine integration, booking history, mobile usability, and venue ranking.

  Phase 4: Public Launch   28 Jul 2026 Public Demos & Feedback           Demo the app, collect feedback, and finalise prototype/report submission.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------

## Risks and Mitigations

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Risk                                         Likelihood   Mitigation Strategy
  -------------------------------------------- ------------ -------------------------------------------------------------------------------------------------------------------------------------------------------
  *Missing Workspace Metadata (Wi-Fi/Plugs)*   High         Mitigated by leveraging manually curated seeded sets and simulated host attributes for early validation and outreach efforts to business federations.

  Scope Expansion & Complexity Constraints     Low          Deferring advanced features to stretch goals, preserving focus on core matching paths.

  Integration Merging Bottlenecks              Medium       Strict role modularity and a process of continuous integration and milestone testing throughout development.
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 6. Tentative Budget

  --------------------------------------------------------------------------------------------------------
  Item                                    Estimated Hours   Estimated Hourly Cost   Total Estimated Cost
  --------------------------------------- ----------------- ----------------------- ----------------------
  Product/Integration/UX/Documentation    500               25 euros                12 500 euros

  Frontend Development                    500               25 euros                12 500 euros

  Backend/API Development                 600               25 euros                15 000 euros

  Testing/QA                              400               25 euros                10 000 euros

  **Total Estimated Development Hours**   2000              25 euros                **50 000 euros**
  --------------------------------------------------------------------------------------------------------

For each Sprint, a cost breakdown per feature will detail the total cost per sprint and the general budget will be updated and corrected accordingly.

Total Estimated Budget (Development + Other): 50 000 euros + other estimates costs (roughly 10 - 20%) = **55000 to 60 000 euros**
