# AION - AI-Powered Knowledge Management System

AION is a powerful knowledge management system that allows users to store and retrieve Chronicles (text snippets with reference links) using AI-powered search capabilities.

## Features

- User Authentication with JWT
- Chronicle Management (Create, Read, Update, Delete)
- AI-Powered Search using Qdrant Vector Database
- Web Scraping for Reference Links
- Natural Language Querying using Google's Gemini AI
- User Profile Management

## Tech Stack

- Node.js with TypeScript
- Express.js
- PostgreSQL with Prisma ORM
- Qdrant Vector Database
- Google Gemini AI
- JWT Authentication
- Web Scraping with Puppeteer

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- Qdrant Vector Database
- Google AI API Key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd aion-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/aion_db"

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=chronicles

# Google AI Configuration
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Web Scraping Configuration
MAX_SCRAPE_DEPTH=2
SCRAPE_TIMEOUT=30000
```

4. Initialize the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user

### Chronicles
- `POST /api/chronicles` - Create a new chronicle
- `GET /api/chronicles` - Get all chronicles
- `GET /api/chronicles/search` - Search chronicles
- `DELETE /api/chronicles/:id` - Delete a chronicle

### AI Query
- `POST /api/search/query` - Ask AI questions about your chronicles

### User Profile
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update user profile

## Development

- `npm run dev` - Start development server
- `npm run build` - Build the project
- `npm start` - Start production server
- `npm test` - Run tests

## License

MIT 