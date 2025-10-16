# Parking Management System (PMS)

## Project Overview

This project is a web-based Parking Management System developed using Django (Python framework) and SQLite as the database. The primary goal is to efficiently manage parking passes, vehicle entries/exits, and notify users about pass expirations using a robust backend system.

## Current Status: Backend Foundation (V1.0)

The core backend functionalities are now fully implemented and tested. This includes:
*   Defining all necessary database models.
*   Implementing API endpoints for key operations (pass creation, vehicle entry/exit).
*   Setting up a system for automated pass expiry checks and notifications.
*   Configuring the Django Admin panel for easy data management.

The next phase of development will focus on integrating these backend functionalities with a user-friendly frontend interface.

## Features

### I. Core Data Management
*   **Owner Management:** Stores owner details (name, contact, email) and links to vehicles.
*   **Vehicle Management:** Records vehicle specifics (number, type, owner, make, model). `vehicle_number` is a unique identifier.
*   **Parking Pass Management:** Manages various parking pass types (Daily, Weekly, Monthly, Yearly) with issue and expiry dates, and an active status.
*   **Transaction Logging:** Logs vehicle entry and exit times, and calculates parking fees for vehicles without active passes.
*   **Notification System:** Stores system-generated notifications, primarily for pass expiry reminders and post-expiry alerts.

### II. API Endpoints (Django Views)
*   `GET /`: Dashboard view (currently renders a basic template; data integration pending).
*   `POST /create_pass/`: Creates a new parking pass for a vehicle. Handles owner and vehicle creation/lookup.
*   `POST /entry/`: Records a vehicle entering the parking facility.
*   `POST /exit/`: Records a vehicle exiting, calculates fees if no active pass.
*   `POST /notifications/<id>/mark_read/`: Marks a specific notification as read.

### III. Scheduled Tasks / Background Processes
*   `check_expiry` (Django Management Command): Identifies expired/expiring passes, updates their status, and generates notifications. Designed to be run periodically via a system scheduler (e.g., Cron).

### IV. Development & Management Tools
*   **Django Admin Panel:** A powerful interface for viewing, adding, editing, and deleting all data models.
*   **`seed_data` (Django Management Command):** A utility to quickly populate the development database with sample data for testing purposes.

## Technologies Used

*   **Backend:** Python 3.x, Django 5.x (or compatible version)
*   **Database:** SQLite3 (for development; easily swappable for PostgreSQL/MySQL in production)
*   **Version Control:** Git

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Python 3.8+
*   pip (Python package installer)
*   Git

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your_repository_url>
    cd parking-management-system
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**
    *   **On Windows:**
        ```bash
        .\venv\Scripts\activate
        ```
    *   **On macOS/Linux:**
        ```bash
        source venv/bin/activate
        ```

4.  **Install dependencies:**
    ```bash
    pip install django
    # You might want to create a requirements.txt file with `pip freeze > requirements.txt`
    # and then install with `pip install -r requirements.txt` in the future.
    ```

5.  **Database Setup (Initial Migration):**
    Since `db.sqlite3` is ignored by Git, you need to set up your database for the first time.
    ```bash
    python manage.py makemigrations parking_app
    python manage.py migrate
    ```
    *   **Note:** During `makemigrations`, if prompted to provide a one-off default for `Vehicle.owner`, you'll need an `Owner` to exist first. If so, run `python manage.py createsuperuser`, then `python manage.py runserver`, create an `Owner` via `/admin/`, then stop the server and rerun `makemigrations` providing the `Owner`'s ID (usually `1`).

6.  **Create a Superuser (for Django Admin access):**
    ```bash
    python manage.py createsuperuser
    ```
    Follow the prompts to create your admin username and password.

7.  **Load Sample Data (Optional, but recommended for testing):**
    If you've implemented the `seed_data` management command:
    ```bash
    python manage.py seed_data
    ```
    Otherwise, you can manually add data via the admin panel after starting the server.

### Running the Application

1.  **Start the Django development server:**
    ```bash
    python manage.py runserver
    ```
    The application will be accessible at `http://127.0.0.1:8000/`.

2.  **Access Django Admin:**
    Go to `http://127.0.0.1:8000/admin/` and log in with your superuser credentials to manage data.

### Testing Backend Endpoints

You can test the API endpoints using tools like Postman, Insomnia, or `curl`.

**Example using `curl` (from a new terminal window):**

*   **Create Pass (ensure `csrf_exempt` is temporarily applied to view for `curl` without token):**
    ```bash
    curl -X POST -d "vehicle_number=TEST0123&owner_name=TestOwner&vehicle_type=car&pass_type=monthly" http://127.0.0.1:8000/create_pass/
    ```

*   **Vehicle Entry:**
    ```bash
    curl -X POST -d "vehicle_number=TEST0123" http://127.0.0.1:8000/entry/
    ```

*   **Vehicle Exit:**
    ```bash
    curl -X POST -d "vehicle_number=TEST0123" http://127.0.0.1:8000/exit/
    ```
    **(Remember to remove `@csrf_exempt` from views after testing for security.)**

### Running Expiry Checks

To manually trigger the expiry check (simulating a scheduled task):
```bash
python manage.py check_expiry
