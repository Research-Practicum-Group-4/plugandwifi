# **Architecture and Technology Stack**

## **1. Architecture Overview**

Flexible Space Finder **will use** a modular client-server architecture designed for rapid MVP development, clear team role separation, and future scalability.

The system **will consist** of five main layers:

1.  **Frontend Layer** -- user and provider interface

2.  **Backend API Layer** -- application logic, authentication, booking, and data processing

3.  **Database Layer** -- persistent storage for users, venues, bookings, availability, and provider data

4.  **Data & ML Layer** -- workspace suitability prediction, venue ranking, and recommendation logic

5.  **External Services Layer** -- third-party APIs for venue data, maps, and future payments

The initial MVP **will focus** on a responsive web application rather than a full native mobile application. This **will allow** the team to support both desktop and mobile users while keeping development realistic within the sprint timeline.

User / Provider

↓

React Frontend

↓

Flask Backend API

↓

MySQL Database

Flask Backend API also connects to:

\- Google Maps API for map display and location-based search

\- Google Places API for venue metadata

\- Yelp Fusion API for alternative business discovery

\- OpenStreetMap / Overpass API for public mapping and geolocation data

\- Future Stripe Payment Integration

\- ML Recommendation Model

This structure **keeps** the system modular. The frontend **will communicate** with the backend through REST APIs, while the backend **will manage** database access, external API calls, authentication, booking logic, and ML-based recommendation outputs.

## **2. Frontend Architecture**

### **Technology**

The frontend **will be built** using:

- React

- JavaScript

- HTML / CSS

- Responsive CSS / Flexbox / Grid

- REST API integration

React **was selected** because it **supports** component-based development. This **allows** the team to reuse interface elements such as venue cards, filter panels, booking forms, account views, and provider dashboard components.

### **Main Frontend Components**

The frontend **will include** the following major screens:

- Landing / search page

- Venue listing page

- Filter panel

- Venue detail page

- Booking confirmation page

- Login and registration pages

- User account and booking history page

- Provider listing and availability management interface

### **Frontend Responsibilities**

The frontend **will handle**:

- displaying workspace listings

- allowing users to search and filter venues

- showing venue details such as Wi-Fi, plug access, quietness, distance, price, and availability

- supporting booking and cancellation flows

- displaying simulated booking/payment confirmation status

- showing ranked or recommended venue results

- providing a responsive interface for mobile users

The Web Frontend Lead **will ensure** that the React interface **connects** correctly with backend API responses and **remains** consistent across desktop and mobile screen sizes.

## **3. Mobile UX and Responsive Design**

The MVP **will prioritise** a mobile-responsive web experience instead of a separate native mobile application.

This decision **reduces** development complexity while still supporting users who need to find and book nearby workspaces quickly while moving around the city.

### **Mobile Design Priorities**

The mobile interface **will focus** on:

- simplified navigation

- large tap targets

- mobile-friendly venue cards

- collapsible or bottom-sheet filter panels

- concise booking screens

- clear confirmation messages

- reduced scrolling and unnecessary input

### **Mobile User Flow**

****Search nearby workspace

↓

Apply filters

↓

View venue details

↓

Confirm booking

↓

Receive booking confirmation

The mobile design **will show** the most important decision-making information first:

- distance

- availability

- Wi-Fi access

- plug access

- quietness level

- estimated suitability score

- price or booking duration

This mobile-first structure **will support** users who need fast decisions in busy urban environments.

## **4. Backend Architecture**

### **Technology**

The backend **will be developed** using:

- Python

- Flask

- REST API architecture

- SQLAlchemy ORM

- JWT-based authentication

Flask **was selected** because it **is** lightweight, flexible, and suitable for building an MVP within a limited academic sprint schedule. It also **works** well with Python-based data processing and machine learning components.

### **Backend Responsibilities**

The backend **will manage**:

- user registration

- basic JWT-based authentication

- token-based login flow

- password hashing

- venue listing data

- search and filtering logic

- booking creation and cancellation

- simulated booking/payment confirmation

- provider availability management

- user booking history

- API validation and error handling

- communication between frontend, database, external services, and ML model

Passwords **will be stored** securely using hashing rather than plain text.

### **Main API Areas**

The backend **will expose** REST API endpoints for:

- user authentication

- venue retrieval

- filtering and search

- venue details

- booking creation

- booking cancellation

- provider availability

- user booking history

- ML-based venue recommendation output

Example endpoint structure:

POST /api/auth/register

POST /api/auth/login

GET /api/venues

GET /api/venues/{venue_id}

GET /api/venues/search

GET /api/recommendations?lat=&lng=&wifi=true&plug=true

POST /api/bookings

DELETE /api/bookings/{booking_id}

GET /api/users/{user_id}/bookings

POST /api/providers/{provider_id}/availability

The recommendation endpoint **will allow** the frontend to request ranked venue suggestions based on user location, preferences, and selected filters.

## **5. Database Architecture**

### **Technology**

The database **will use**:

- MySQL

- SQLAlchemy ORM

MySQL **was selected** because the application **requires** structured relational data for users, providers, venues, availability schedules, bookings, and recommendation-related metadata.

### **Main Database Entities**

  **Entity**                       **Purpose**
  -------------------------------- -----------------------------------------------------------------------------------
  Users                            Stores user account information
  Providers                        Stores business/provider information
  Venues                           Stores venue details and workspace metadata
  Availability Slots               Stores bookable time windows created by providers
  Bookings                         Stores confirmed user reservations against availability slots
  Reviews / Feedback               Optional future table for user feedback on venue quality
  ML Features / Ranking Metadata   Stores workspace suitability features and optionally cached recommendation scores

Availability Slots **define** when a provider makes a venue bookable. Bookings **store** confirmed user reservations against those available slots.

### **Key Venue Attributes**

The venue table **will store**:

- venue name

- business category

- address

- latitude and longitude

- opening hours

- estimated seating capacity

- Wi-Fi availability

- plug access

- quietness suitability

- booking availability

- venue rating

- workspace suitability score

This structure **supports** filtering, booking, and ML-based recommendation functionality.

## **6. Data Acquisition Strategy**

The platform **will require** realistic venue data to support workspace discovery and recommendation.

During Sprint 1, the Data & ML role **will evaluate** third-party APIs and external venue acquisition strategies, including:

- **Google Maps API** for map display, route context, and location-based search

- **Google Places API** for venue names, addresses, geolocation, opening hours, ratings, and business categories

- **Yelp Fusion API** as an alternative business discovery source

- **OpenStreetMap / Overpass API** for publicly accessible mapping and geolocation data

- **Direct provider onboarding** for workspace-specific information

- Other relevant location-based data sources

Since many workspace-specific attributes are not usually available in public APIs, the MVP **will use** fallback strategies.

### **Missing Metadata Strategy**

Attributes such as Wi-Fi availability, plug access, quietness, seating capacity, and workspace suitability **may not be available** from external APIs.

To handle this, the MVP **will use**:

- manually curated metadata

- simulated provider-entered data

- seeded development datasets

- heuristic workspace suitability scores

- future user feedback signals

This approach **will allow** the team to validate the product concept even if complete real-world venue data **is not available** during development.

## **7. Authentication and User Management**

The MVP **will use** basic JWT-based authentication.

This **will allow** users to:

- register

- log in

- maintain authenticated access

- make bookings

- view booking history

- cancel bookings

JWT authentication **was chosen** because it **is** suitable for lightweight API-based applications and **fits** the Flask backend structure.

For the MVP, authentication **will remain** simple and focused on user access control. More advanced security features, such as multi-factor authentication or social login, **can be added** later if the product expands.

## **8. Booking and Payment Handling**

The MVP **will implement** booking creation, cancellation, and confirmation workflows.

However, live payment processing **will not be included** in the initial MVP. The MVP **will not process** real transactions. Instead, the system **will simulate** the payment or confirmation step to demonstrate the intended booking journey without adding unnecessary payment integration complexity.

### **MVP Booking Flow**

****User selects venue

↓

User chooses time slot

↓

System checks availability

↓

Booking is created

↓

Simulated confirmation is displayed

Live payment integration using Stripe **will be considered** as a future enhancement after the booking workflow **has been validated**.

## **9. Data & ML Layer**

The MVP **will include** a basic machine learning recommendation model to predict or score workspace suitability.

The purpose of the ML component **is** to help users identify the most suitable venues more quickly based on venue attributes, availability, and user preference signals.

A rule-based ranking baseline **will also be implemented** as a fallback and comparison point. This **will help** the team compare whether the ML model **improves** venue ranking quality over a simpler scoring method.

### **ML Model Purpose**

The ML model **will support**:

- workspace suitability prediction

- venue ranking

- personalised recommendation potential

- faster decision-making for mobile users

### **ML Input Features**

The initial model **may use** features such as:

- distance from user

- venue rating

- Wi-Fi availability

- plug access

- quietness suitability

- opening hours

- booking availability

- business category

- seating capacity

- user preference indicators

- workspace suitability score

### **ML Label Generation**

Since real user behaviour data may not be available during the early MVP stage, the initial training labels **can be generated** using a workspace suitability score.

This suitability score **can be calculated** from factors such as:

- Wi-Fi availability

- plug access

- quietness suitability

- venue availability

- distance from the user

- venue rating

- seating capacity

- opening hours

For example, venues with strong Wi-Fi, plug access, quietness, good availability, and short distance from the user **would receive** higher suitability labels. This **allows** the team to train and test an initial ML model even before collecting real booking and review data.

### **Initial ML Approach**

The team **will begin** with a simple supervised learning or scoring-based approach, depending on available data quality.

Possible MVP model options **include**:

- Logistic Regression

- Decision Tree

- Random Forest

- baseline rule-based ranking for comparison

The expected model output **will be** a workspace suitability score or recommendation ranking.

### **ML Evaluation**

The ML model **will be evaluated** by comparing its ranking output against the rule-based baseline.

Evaluation **may include**:

- checking whether highly suitable venues are ranked near the top

- comparing ML-generated rankings with heuristic suitability scores

- using simple metrics such as accuracy, precision@k, or ranking comparison

- reviewing whether recommended venues match user-selected filters and preferences

This evaluation **will help** the team decide whether the ML model **provides** meaningful improvement over simple rule-based sorting.

### **ML Tools**

The Data & ML component **will use**:

- Python

- pandas

- scikit-learn

- joblib or pickle for model saving

- Flask API integration for serving recommendation results

### **ML Workflow**

****Venue data collection

↓

Feature preparation

↓

Label generation using suitability score

↓

Model training

↓

Model evaluation against rule-based baseline

↓

Workspace suitability prediction

↓

Recommendation ranking

↓

Frontend displays ranked venue results

### **MVP Limitation**

Because real user behaviour data may not be available at the beginning, the initial ML model **may rely** on seeded, curated, or simulated training data.

As the platform **collects** more user interactions, bookings, and reviews, the model **can be improved** using real behavioural data.

### **Future ML Enhancements**

Future versions **may include**:

- personalised workspace recommendations

- AI-powered workspace suggestions

- AI chatbot assistance

- occupancy prediction

- smart preference-based venue matching

- dynamic pricing support for providers

These advanced features **will remain** outside the initial MVP scope unless core development **is completed** ahead of schedule.

## **10. Deployment Architecture**

For deployment, the team **will use** lightweight cloud hosting services suitable for student MVP delivery.

### **Preferred Deployment Stack**

- Backend: Render

- Backend fallback: Railway

- Frontend: Vercel

- Database: hosted MySQL environment

Render **will be used** as the preferred backend deployment platform because it **supports** simple Flask application deployment. Railway **will remain** a fallback option if backend deployment issues **occur**.

Vercel **will be used** for the React frontend because it **supports** fast deployment and frontend preview workflows.

### **Deployment Responsibilities**

The deployment setup **will include**:

- backend API hosting

- frontend hosting

- production database configuration

- environment variables for API keys

- connection testing between frontend, backend, database, and ML model

- responsive testing in the deployed environment

## **11. Preliminary System Flow**

****1. User opens the web app

2\. React frontend requests venue data from Flask backend

3\. Flask backend retrieves venue data from MySQL

4\. Backend applies filtering and calls the ML recommendation logic

5\. ML model returns workspace suitability scores

6\. Backend returns ranked venue results to the frontend

7\. User applies filters for Wi-Fi, plugs, quietness, and availability

8\. User selects a venue and creates a booking

9\. Backend validates availability and stores the booking

10\. Frontend displays simulated booking/payment confirmation

11\. User can view or cancel the booking from account history



## **12. Why This Stack Fits the Project**

This architecture **fits** the project because it **supports** realistic MVP delivery within the academic sprint timeline while still allowing meaningful Data & ML contribution.

It **is** appropriate because:

- React **supports** reusable and responsive frontend development

- Flask **provides** a lightweight backend suitable for MVP APIs

- MySQL **supports** structured booking and availability data

- SQLAlchemy **simplifies** database interaction

- JWT authentication **enables** basic secure user access

- Google Maps API **supports** map display and location-based search

- Google Places API, Yelp Fusion API, and OpenStreetMap **support** venue discovery

- seeded datasets **reduce** dependency on incomplete third-party data

- the ML model **provides** recommendation functionality beyond simple filtering

- rule-based ranking **provides** a fallback and comparison baseline

- Render and Vercel **support** practical deployment for a student project

Overall, the architecture **prioritises** feasibility, modular development, and future scalability. It **allows** the team to build a working MVP first, while leaving space for advanced features such as AI chatbot support, personalised recommendations, live payments, QR check-in, and real-time environmental verification in later iterations.
