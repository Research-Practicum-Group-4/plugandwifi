# Plug & Wifi - Flexible Space Finder

## 📖 Project Overview
Welcome to the repository for **Plug & Wifi**, a flexible space finder platform that acts as an intermediary between space users and space providers. Our platform aims to solve the friction of finding reliable, short-term workspaces (1 to 3 hours) for remote professionals, international business travellers, and students. By leveraging underutilised real estate during off-peak hours, we provide verified environments with guaranteed Wi-Fi and plug access.

## 🏗️ Project Structure (Monorepo)
To streamline our development process and ensure API compatibility across all platforms, we use a **Monorepo** architecture. The repository is divided into the following dedicated directories:

* 📁 **`/frontend-web`** - Contains the React codebase for the web application.
* 📁 **`/frontend-mobile`** - Contains the mobile application codebase.
* 📁 **`/backend`** - Contains the Python/Flask REST API and database configuration.
* 📁 **`/data-ml`** - Contains datasets, data cleaning scripts, and machine learning models (Venue ranking/predictions).
* 📄 **`.gitignore`** - Global git ignore rules.
* 📄 **`CONTRIBUTING.md`** - Guidelines for our branching strategy and pull request workflows.

> **Note for Developers:** Each sub-directory will contain its own specific `README.md` with instructions on how to install dependencies and run that specific service locally.

## 🛠️ Architecture and Technology Stack

| Component | Technology/Framework | Rationale |
| :--- | :--- | :--- |
| **Frontend (Mobile/Web)** | React, JavaScript, HTML, CSS | Reusable, responsive UI development. |
| **Backend/API** | Python, Flask, REST API, JWT | Lightweight API development and secure login. |
| **Database** | MySQL, SQLAlchemy ORM | Structured data storage and simpler database access. |
| **Data & ML** | Python, pandas, scikit-learn | Venue ranking and suitability prediction. |
| **Hosting/Cloud** | AWS EC2, AWS RDS for MySQL | Scalable hosting and MySQL management. |
| **DevOps** | Docker | Containerisation for continuous deployment. |

## 🚀 Getting Started
Before starting any development work, please ensure you have synchronised your local repository with the latest changes from the `main` branch.

1. Clone the repository:
```bash
   git clone [Your-Repository-URL]
```

2. Navigate to your designated team directory (cd frontend-web, cd backend, etc.).

3. Always create a new feature branch from develop before writing any code. Do not push directly to main.