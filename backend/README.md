# eSigns Backend API Server

Fast and lightweight Node.js & Express REST API server for the **eSigns** parking and road sign data collection mobile application.

## Features
- **Reports CRUD**: Full support for submitting, updating, retrieving, and filtering parking sign reports.
- **Reference & Code Integrity**: Preserves unique `ref` (`ESG-YYYYMMDD-XXXXX`) and `signCode` (`SGN-XXXX-XXXX`) on edits.
- **Persistence**: Persists data to `data/reports.json` out of the box (no external database installation needed, ready for MongoDB / PostgreSQL upgrade).
- **Environment Configuration**: Configured with `.env` file.

## Environment Variables (.env)
```env
PORT=5000
NODE_ENV=development
DATA_FILE=./data/reports.json
```

## Running the Server
```bash
cd backend
npm install
npm start
```
Dev mode with auto-reload:
```bash
npm run dev
```

## API Endpoints
- `GET /api/health` - Health check status
- `POST /api/auth/login` - Field inspector login
- `GET /api/reports` - List reports with filters (`fromDate`, `toDate`, `suburb`, `condition`, `search`)
- `GET /api/reports/:ref` - Retrieve single report
- `POST /api/reports` - Create a new sign report
- `PUT /api/reports/:ref` - Update an existing report
- `DELETE /api/reports/:ref` - Delete a report

