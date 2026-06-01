# **Meeting Minutes: Sprint 1 Mid-Sprint Sync**

- **Project Title:** Plug & Wifi (Group 4)

- **Date:** Thursday, May 28, 2026

- **Time:** 13:30 PM -- 14:00

- **Location:** Online Meeting

- **Chair:** Tzuyu Chang (Scrum Master / Integration Lead)

- **Minute Taker:** Tzuyu Chang

- **Attendees:** Tzuyu Chang, Youssef Bouarada, Sunmin Lee, Adam Treanor, Wenfei Song

- **Absentees:** Peiyou Yao

- **Objective:** Review Sprint 1 progress, align cross-functional dependencies, and prepare for Friday\'s mentor meeting.

## **1. Overview**

The team successfully aligned on the overall structure and task ownership for Sprint 1, covering product management, backend, data engineering, mobile development, and potential administrative tracking. Key strategic decisions made during the sync include keeping product backlog tasks high-level for later subtask refinement, enforcing backend-data schema alignment prior to code integration, and continuing environmental and baseline architecture setups across all platforms.

## **2. Sprint Planning & Task Structure**

- **Task Granularity:** Tzu raised an inquiry regarding whether product management tasks, such as defining user stories and acceptance criteria, should be broken down into granular items or kept as broader placeholders.

- **High-Level Placeholder Agreement:** Youssef advised maintaining tasks at a high level for the time being, allowing each Epic to be gradually decomposed into detailed layers and acceptance criteria as development progresses.

- **Dynamic Subtasks:** The team agreed that contributors can dynamically add subtasks directly within Sprint items during implementation to preserve a clean overview of the Sprint board while allowing flexibility.

## **3. Product Management & Role Coordination**

- **Prioritization & Governance:** Youssef outlined his progress in building the product backlog, utilizing the MoSCoW framework (Must have, Should have, Could have, Won't have) for prioritization. He introduced the RACI matrix to govern cross-functional responsibilities, particularly where front-end design impacts data science or machine learning.

- **One-to-One Synchronization:** Youssef noted he is approaching his current individual capacity and will schedule one-to-one syncs for decisions requiring strategic amendments.

- **Initial Skeleton:** A tentative web architecture skeleton based on Figma and React Native (utilizing a design-to-code plugin) has been uploaded to GitHub.

- **Time Tracking:** Youssef reminded the team to consistently log their weekly working hours to ensure compliance with the module\'s 30-ECTS total workload requirements.

## **4. Backend Progress & Database Structure**

- **Database Schema:** Sunmin presented progress on the backend infrastructure, having successfully configured a PostgreSQL database with five initial tables: availability_slot, booking, provider, user, and venue. These schemas will be dynamically adjusted once Adam delivers real-world data.

- **Git Workflow:** The baseline backend project structure is complete and executable. Tzu instructed Sunmin to push the codebase to GitHub by branching from develop, establishing a dedicated feature branch, and opening a Pull Request (PR) for collaborative review and merge.

- **Integration Alignment:** Tzu emphasized that the backend, data, and front-end teams must align on the final JSON schema and availability-related columns early on to prevent downstream technical debt.

## **5. Data Engineering & Recommendation Features**

- **Data Ingestion:** Adam demonstrated his current data pipeline leveraging OpenStreetMap via the Overpass API. He has successfully ingested roughly 13,800 venues (cafés, hotels, bakeries, restaurants) within the five-borough boundary of New York City, capturing venue ID, cuisine type, telephone numbers, and coordinates.

- **Algorithmic Modeling:** Adam outlined three algorithmic enrichment models for the recommendation engine:

  1.  *Noise Model:* Categorizes hourly noise scores based on venue baselines (e.g., cafés/bakeries vs. hotels/restaurants).

  2.  *Wi-Fi Model:* Uses existing OpenStreetMap Wi-Fi data fields, applying inferred default baselines and user-reported overrides for missing attributes.

  3.  *Transport Proximity Model:* Utilizes KD Trees and the Haversine formula to compute the exact distance from each venue to the nearest NYC subway station and bus stop.

- **Feature Constraints & Academic Inquiry:** The team discussed adding plug availability filters, but due to a lack of reliable open-source data, decided it must remain entirely user-reported or synthetic. Adam will consult the professor on Friday to clarify whether the current OpenStreetMap-derived data satisfies the module\'s requirement for single or multiple independent datasets.

## **6. Mobile Development & Platform Scope**

- **Environment Setup:** Wenfei Song reported that her mobile development environment is fully operational, featuring dual support for both iOS simulators and Android emulators.

- **Platform Target:** Following inquiries regarding platform scope, Youssef noted that previous lectures implied only a single platform target is required. Tzu recommended prioritizing Android as a pragmatic choice due to cheaper developer account fees compared to Apple, though an official app store deployment is not strictly mandatory for grading.

- **Next Steps:** Wenfei Song received approval from Youssef to proceed with a Figma-to-code exercise as she continues mastering React Native. Mobile development remains focused on stabilizing the cross-platform shell.

## **7. Admin Dashboard Evaluation**

- **Scope Discussion:** Tzu opened a discussion on the necessity of a dedicated Admin/Provider dashboard alongside the standard User application.

- **Strategic Split:** Youssef noted that critical parameters can be audited directly via backend logs and database entries, while Sunmin suggested an admin panel would serve as an exceptional portfolio feature.

- **Conclusion:** Tzu finalized that an internal admin dashboard will be categorized as a pendant task or secondary enhancement, ensuring the primary development velocity remains locked onto the user and provider core workflows.

## **8. Action Items & Next Steps**

- **Tzu (Scrum Master):** Share meeting minutes with the absent teammate and compile a short PowerPoint presentation by tonight to prepare for Friday morning\'s 9:45 AM online meeting with the mentor.

- **Frontend, Backend, & Data Leads:** Coordinate and schedule a private, 10-minute offline sync as soon as possible to map out a preliminary mock JSON API contract, enabling parallel development.

- **All Contributors:** Upload all task-related documentation to the Google Drive Week 1-2 folder, update the respective section README.md files in the GitHub directory, and maintain strict adherence to the branch-and-PR workflow. Reach out to Tzu directly if workload redistribution is needed.
