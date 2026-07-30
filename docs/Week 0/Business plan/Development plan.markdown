# **Development Plan**

## **Development Approach**

Flexible Space Finder **will be developed** using an Agile sprint-based implementation approach, allowing the team to deliver the product incrementally through structured development cycles.

The project **will focus** on building a Minimum Viable Product (MVP) that demonstrates the core marketplace functionality within the academic project timeline, while keeping the architecture flexible for future expansion.

Development **will follow** a modular implementation strategy, where each team role **owns** clearly defined product components. This **allows** multiple workstreams to progress in parallel while reducing bottlenecks and integration risks.

The implementation strategy **consists** of:

- prototype-first validation to finalise the user journey and core requirements before coding

- parallel modular development across frontend, backend, mobile UX, and data components

- incremental feature delivery through sprint milestones

- continuous integration and testing throughout development

- progressive refinement based on sprint reviews and internal feedback

The MVP **will prioritise** essential features only:

- user authentication

- provider listing creation

- workspace discovery

- location-based search

- filtering by Wi-Fi, plug access, quietness, and availability

- booking workflow

- simulated booking/payment confirmation

- provider availability management

- basic venue ranking

More advanced features such as AI-powered workspace recommendations, an AI chatbot assistant for workspace discovery and customer support, live payment automation, QR-based check-in, and real-time environmental verification **will be treated** as future enhancements beyond the initial MVP scope.

# **Timeline & Milestones**

## **Sprint 0 -- Discovery, Validation & Project Planning**

### **Objective**

Complete the initial discovery phase, validate the problem space, and establish a clear implementation roadmap for MVP development.

### **Tasks**

## **Product & UX Lead**

- **developed** personas and empathy maps to understand user pain points

- **refined** the problem statement

- **translated** user insights into product requirements

- **created** mockups and interactive prototypes

- **defined** MVP scope and feature priorities

## **Entire Team**

- **conducted** ideation workshops using Crazy 8 and SCAMPER techniques

- **evaluated** alternative concepts and selected the strongest solution

- **performed** competitor analysis

- **defined** the product value proposition

## **Backend**

- **contributed** to preliminary backend architecture discussions

- **identified** core system entities and booking workflow requirements

- **evaluated** suitable backend frameworks and API design approaches for MVP implementation

## **Web Frontend Lead**

- **contributed** to UI structure planning

- **aligned** prototype flows with implementation feasibility

- **evaluated** suitable frontend frameworks for responsive and scalable interface development

## **Mobile UX & Responsive Design**

- **assessed** mobile usability and responsive workflow requirements

- **evaluated** how desktop mockup workflows could be adapted for smaller mobile interfaces

- **identified** key mobile interaction considerations, including simplified navigation, booking flow usability, and responsive layout adjustments

## **Data & ML**

- **explored** recommendation opportunities for personalised venue suggestions

- **identified** potential data sources, including provider-submitted venue data, location-based services, and future user feedback signals

- **defined** initial ranking logic for workspace recommendations

## **Scrum Master & Integration**

- **organised** task ownership

- **established** the product backlog

- **aligned** implementation planning with sprint milestones

### **Deliverables**

- validated personas

- empathy maps

- refined problem statement

- selected product concept

- mockups and interactive prototype

- competitor analysis

- business plan

- MVP scope definition

- preliminary technical roadmap

## **Sprint 1 -- Data Acquisition & Technical Foundation**

### **Objective**

Establish the technical and data foundation required for MVP development by identifying realistic venue data sources, defining the system architecture, and preparing the platform for web and mobile-friendly implementation.

### **Tasks**

## **Data & ML**

- **identify** viable external data sources for workspace venue discovery, focusing on cafés, restaurants, hotel lounges, libraries, and coworking-friendly public venues

- **evaluate** third-party APIs and external venue acquisition strategies, including Google Places API, Yelp Fusion API, OpenStreetMap / Overpass API, direct provider onboarding, and other relevant location-based data sources

- **assess** limitations in publicly available venue metadata, especially for Wi-Fi availability, plug access, noise level, seating capacity, and workspace suitability

- **define** fallback strategies for unavailable attributes using manually curated metadata, simulated provider-entered data, and heuristic scoring logic

- **define** the venue data schema required for MVP filtering and booking, including:

  - venue name

  - business category

  - address

  - latitude / longitude

  - opening hours

  - estimated seating capacity

  - Wi-Fi availability

  - plug access

  - quietness suitability

  - booking availability

  - workspace suitability score

- **prepare** a small seeded prototype dataset for development and testing

## **Backend**

- **design** backend architecture using Flask

- **design** relational database schema in MySQL for users, providers, venues, bookings, and availability schedules

- **configure** database connectivity using SQLAlchemy ORM

- **define** initial REST API endpoint structure for venue retrieval and structured data access

- **plan** data ingestion and storage workflows from selected data sources

- **ensure** planned API responses include mobile-relevant fields such as distance, opening status, key amenities, and booking availability

## **Web Frontend Lead**

- **define** frontend architecture using React

- **prepare** reusable UI components for workspace discovery, search, filtering, and booking workflows

- **align** frontend data models with planned backend API response structures

## **Mobile UX & Responsive Design**

- **define** a mobile-first user journey for users who need to find and book nearby workspaces quickly while moving around the city

- **translate** existing wireframes and mockups into mobile screen flows, including:

  - landing / search screen

  - venue list screen

  - venue detail screen

  - filter panel

  - booking confirmation screen

- **prioritise** thumb-friendly navigation, large tap targets, and simplified screen layouts for mobile users

- **plan** location-based search behaviour using the user's current area or manually entered location

- **define** mobile-specific information hierarchy so that distance, Wi-Fi, plug access, quietness, price, and availability **are visible** immediately

## **Scrum Master & Integration**

- **validate** technical feasibility within the academic project timeframe

- **identify** risks related to third-party API limitations, incomplete metadata, mobile usability, and frontend/backend integration complexity

- **coordinate** sprint deliverables and confirm dependencies between team roles

### **Deliverables**

- validated data acquisition strategy

- selected external API and venue acquisition plan

- MySQL database schema

- Flask backend architecture plan

- initial REST API design

- React frontend architecture

- mobile-first user journey and screen flow

- seeded development dataset

## **Sprint 2 -- Core Booking MVP Development**

### **Objective**

Build the core MVP experience by enabling users to discover, evaluate, and reserve flexible workspaces through both web and mobile-friendly interfaces.

### **Tasks**

## **Backend**

- **implement** workspace listing APIs using structured venue datasets

- **implement** basic JWT-based authentication for MVP user access

- **develop** user registration and token-based login flow

- **develop** filtering logic based on:

  - location proximity

  - Wi-Fi availability

  - plug access

  - quietness level

  - seating capacity

  - opening hours

  - booking availability

- **implement** venue detail APIs for detailed workspace metadata

- **build** booking creation and cancellation workflows

- **simulate** booking/payment confirmation for MVP validation without live payment integration

- **develop** provider-side availability management logic

- **return** mobile-optimised API responses with concise listing data for faster rendering on smaller screens

## **Web Frontend Lead**

- **develop** homepage workspace discovery interface

- **build** login and registration interfaces

- **implement** authenticated user access using token-based login

- **implement** search functionality with dynamic filtering controls

- **build** venue detail pages

- **develop** booking confirmation and cancellation flows

- **display** simulated payment/booking confirmation status during the MVP booking journey

- **integrate** frontend components with backend APIs

## **Mobile UX & Responsive Design**

- **build** responsive mobile layouts for the main booking journey:

  - search nearby workspace

  - apply filters

  - compare venue options

  - open venue details

  - confirm booking

- **optimise** login, registration, and booking screens for mobile users

- **implement** a mobile-friendly filter panel using collapsible sections or bottom-sheet style interaction

- **optimise** venue listing cards for mobile by showing only the most important decision-making information first:

  - distance

  - availability

  - Wi-Fi

  - plug access

  - quietness level

  - estimated suitability score

- **design** the booking flow to minimise user input on mobile devices

- **ensure** that the mobile booking confirmation screen clearly shows venue name, date, time, booking duration, and confirmation status

- **test** mobile layouts across common screen sizes using browser developer tools and responsive design checks

## **Data & ML**

- **implement** rule-based venue ranking logic using:

  - proximity weighting

  - workspace suitability score

  - user preference matching

  - availability status

- **adjust** ranking output so that mobile users can quickly see the most relevant nearby venues first

- **document** assumptions behind the initial ranking model

## **Scrum Master & Integration**

- **track** implementation dependencies across backend, frontend, data, and mobile workflows

- **monitor** sprint deliverables and integration progress

- **ensure** that the core booking journey works on both desktop and mobile views

### **Deliverables**

- searchable workspace listing system

- basic JWT-based authentication

- filtering functionality

- venue detail pages

- working booking workflow

- simulated booking/payment confirmation

- provider availability management

- initial ranking logic

- mobile-friendly booking journey

- usable MVP prototype

## **Sprint 3 -- Platform Integration, User Account Features & Mobile Enhancement**

### **Objective**

Transform the core booking prototype into a more structured application platform with persistent user management, integrated workflows, basic ranking functionality, and improved mobile usability.

### **Tasks**

## **Backend**

- **persist** booking, provider, venue, and user data within MySQL

- **develop** user account-related API endpoints, including booking history

- **refine** API validation and error handling

- **improve** backend service reliability and consistency

- **support** authenticated booking workflows through secure API endpoints

- **validate** database consistency across users, venues, availability, and bookings

## **Web Frontend Lead**

- **develop** user account views, including booking history

- **integrate** authenticated user access with booking functionality

- **connect** frontend workflows with backend APIs

- **refine** venue discovery, booking, and cancellation interfaces

- **improve** loading states and error handling on web views

## **Mobile UX & Responsive Design**

- **adapt** authenticated user flows for smaller mobile interfaces

- **create** a simplified mobile account area showing:

  - upcoming bookings

  - previous bookings

  - saved preferences

  - cancellation options

- **refine** touch interactions for filters, booking buttons, navigation menus, and confirmation actions

- **improve** loading states and error messages for mobile users

- **conduct** mobile usability testing using realistic booking scenarios, such as:

  - finding a quiet workspace nearby

  - filtering for Wi-Fi and plug access

  - booking a venue for a short time slot

  - cancelling a booking

## **Product & UX Lead**

- **validate** implemented workflows against original user journey requirements

- **review** usability consistency across desktop and mobile experiences

- **refine** booking interactions and account flows based on usability feedback

- **ensure** MVP scope remains aligned with product priorities

## **Data & ML**

- **refine** venue ranking logic using available venue metadata

- **evaluate** recommendation scoring using factors such as:

  - distance

  - venue ratings

  - availability

  - Wi-Fi / plug suitability

  - user preference indicators

- **assess** feasibility of future AI-powered recommendation enhancements

- **prepare** notes on how an AI chatbot or personalised recommendation feature could extend the MVP after core delivery

## **Scrum Master & Integration**

- **coordinate** frontend/backend integration milestones

- **manage** issue tracking and sprint review preparation

- **validate** API compatibility and data consistency

- **monitor** progress against sprint goals

## **Integration / Entire Team**

- **perform** end-to-end workflow testing:

  - user discovery

  - filtering

  - venue selection

  - booking

  - confirmation

- **identify** and resolve workflow-breaking issues

- **test** the full MVP across desktop and mobile screen sizes

- **validate** stable module integration

### **Deliverables**

- persistent booking infrastructure

- integrated frontend/backend system

- user account and booking history functionality

- basic ranking-enabled MVP

- stable end-to-end booking workflow

- improved mobile booking experience

- mobile usability feedback summary

## **Sprint 4 -- Testing, Deployment & Final Refinement**

### **Objective**

Prepare the final demonstrable MVP through testing, deployment, performance refinement, mobile optimisation, and presentation preparation.

### **Tasks**

## **Product & UX Lead**

- **coordinate** usability testing based on target personas

- **evaluate** whether final workflows satisfy identified user needs

- **refine** UX based on testing feedback

- **support** demo storytelling and product positioning

- **confirm** that the product value proposition is clearly reflected in the final demo

## **Backend**

- **fix** backend bugs and workflow inconsistencies

- **optimise** API performance and reliability

- **validate** production database connectivity

- **support** deployment troubleshooting

- **confirm** that backend services remain stable during the demo flow

## **Web Frontend Lead**

- **refine** UI usability and workflow consistency

- **fix** frontend bugs

- **optimise** interface responsiveness

- **validate** production frontend deployment

- **ensure** that core pages remain consistent across common desktop screen sizes

## **Mobile UX & Responsive Design**

- **perform** final responsive testing across common mobile screen sizes

- **ensure** navigation, filters, venue cards, and booking actions remain usable on small screens

- **optimise** mobile page layouts to reduce friction

- **validate** complete mobile user journeys:

  - search

  - filter

  - venue detail

  - booking

  - confirmation

- **prepare** mobile demonstration scenarios

- **document** key mobile UX design decisions, such as simplified navigation, prioritised venue information, and touch-friendly booking actions

## **Data & ML**

- **validate** recommendation logic under realistic usage scenarios

- **test** ranking consistency with real booking workflows

- **document** future AI chatbot and personalised recommendation opportunities

- **summarise** limitations of the MVP ranking approach and possible improvements

## **Scrum Master & Integration**

- **coordinate** deployment readiness

- **manage** issue resolution

- **oversee** final sprint progress

- **confirm** milestone completion before final submission

- **coordinate** final sprint review preparation

## **Deployment**

- **deploy** backend services to Render, with Railway as a fallback option

- **deploy** the React frontend using Vercel

- **configure** the production MySQL database environment

- **validate** deployment stability

- **verify** mobile responsiveness in the deployed environment

## **Entire Team**

- **conduct** usability testing with realistic user scenarios

- **perform** full system validation

- **fix** performance bottlenecks

- **prepare** final demo scenarios

- **finalise** presentation materials

- **validate** demo stability before submission

### **Deliverables**

- deployed MVP platform

- stable live demonstration environment

- validated basic ranking functionality

- refined cross-platform user experience

- final presentation-ready prototype

- mobile-ready MVP demonstration

- documented mobile usability improvements

- future AI enhancement roadmap

# **Optional Stretch Goals**

If MVP delivery is completed ahead of schedule, the team may explore advanced features such as:

- AI chatbot for workspace discovery assistance

- personalised recommendation engine

- smart preference-based venue matching

- provider analytics dashboard

- QR-based booking check-in automation

- live online payment integration

- mobile push-style booking reminders

- saved favourite venues for frequent mobile users

- map-based mobile venue discovery

# **Risks and Mitigation**

+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > **Risk**                                                                | > **Mitigation**                                                                                        |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Third-party API limitations or rate limits                              | > Use seeded datasets and fallback provider metadata during MVP development                             |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Missing workspace-specific metadata such as Wi-Fi, plugs, and quietness | > Simulate provider-entered attributes for MVP validation                                               |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Scope becoming too ambitious                                            | > Maintain strict MVP prioritisation and sprint backlog control                                         |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Frontend/backend integration delays                                     | > Use continuous integration throughout development rather than late-stage merging                      |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Limited provider-side realism                                           | > Use simulated provider onboarding and availability workflows                                          |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Mobile implementation taking too much time                              | > Prioritise responsive web MVP and mobile-first critical screens rather than a full native app         |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Mobile usability becoming too complex                                   | > Simplify the mobile flow around search, filtering, venue detail, and booking confirmation             |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Technical complexity in advanced AI features                            | > Defer non-essential intelligent features to stretch goals                                             |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Live payment integration becoming too complex                           | > Use simulated payment confirmation in the MVP and defer live Stripe integration to future development |
+---------------------------------------------------------------------------+---------------------------------------------------------------------------------------------------------+
| > Time pressure due to academic deadlines                                 | > Maintain clear sprint ownership and milestone monitoring                                              |
+===========================================================================+=========================================================================================================+

# **Feasibility Justification**

This development plan **is realistic** because it starts with data validation before implementation, reducing uncertainty around whether the platform can be built with accessible venue information.

It **prioritises** the core product value of workspace discovery and booking before secondary infrastructure features such as advanced AI, QR automation, and live payment processing.

It **uses** a lightweight and practical technical stack appropriate for rapid MVP delivery: Flask for backend services, React for frontend implementation, MySQL for relational data storage, and SQLAlchemy for database connectivity.

It **strengthens** the mobile role by treating mobile not only as a screen-size adjustment, but as a specific user experience for people who need to find and book nearby workspaces quickly.

It **reduces** project risk by using seeded datasets, simulated provider metadata, simulated payment confirmation, and rule-based ranking logic before attempting more advanced recommendation features.

It **keeps** the MVP scope realistic while still allowing future expansion into AI assistance, personalised recommendations, provider analytics, live payments, and map-based mobile discovery.

- 
