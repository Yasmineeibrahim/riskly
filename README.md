# Riskly

A risk management application with MySQL database support for advisor management.

## Database Support

This application uses MySQL database for advisor management:

### Advisor Table Structure (MySQL)
- `_id` varchar(24) - Primary Key
- `Email` varchar(255) - Unique email address
- `Password` varchar(255) - Encrypted password
- `advisor_name` varchar(255) - Advisor's full name
- `Students` json - Array of student IDs

### Features

#### Login System
- **SQL Database Login**: The login system checks the MySQL database for advisor authentication
- **Secure Authentication**: Validates email and password against the advisors table
- **JWT Token Generation**: Returns a JWT token for authenticated sessions

#### API Endpoints

##### Authentication
- `POST /api/advisorLogin` - Login with email and password (checks SQL database)

##### Advisor Management
- `GET /api/advisors` - Fetch all advisors from SQL database
- `GET /api/advisors/fetchadvisors` - Fetch all advisors from SQL database
- `POST /api/advisors/createadvisors` - Create new advisor in SQL database
- `PUT /api/advisors/updateadvisor/:id` - Update advisor in SQL database
- `DELETE /api/advisors/deleteadvisor/:id` - Delete advisor from SQL database
- `GET /api/advisors/:id` - Fetch specific advisor by ID from SQL database

### Testing

The application includes comprehensive testing for SQL database connectivity and advisor management operations.

### Environment Variables

Make sure to set up the following environment variables:
- `DB_NAME` - MySQL database name
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_HOST` - MySQL host
- `DB_PORT` - MySQL port
- `JWT_SECRET` - JWT secret key