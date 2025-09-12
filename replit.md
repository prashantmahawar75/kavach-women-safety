# Kavach - Women Safety App

## Overview

Kavach is a women's safety application built with a modern full-stack architecture using React, Express, and PostgreSQL. The app provides real-time incident reporting, unsafe zone mapping, emergency services, and administrative management capabilities. It features a responsive web interface with interactive maps, user authentication, and role-based access control for both regular users and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Maps**: Leaflet.js for interactive mapping functionality

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM with schema-first approach
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **API Design**: RESTful API with role-based access control
- **Session Management**: PostgreSQL-based session storage

### Database Design
- **Database**: PostgreSQL with Neon serverless driver
- **Tables**: 
  - `users` - User accounts with roles (user/admin)
  - `reports` - Incident reports with location data and status tracking
  - `unsafe_zones` - Geographic zones with risk levels and report counts
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Validation**: Drizzle-Zod integration for runtime type safety

### Authentication & Authorization
- **User Roles**: Two-tier system (user/admin)
- **Admin Access**: Hardcoded credentials for admin user (prashant75/prashant232323)
- **Token Storage**: localStorage for client-side JWT storage
- **Protected Routes**: Middleware-based route protection with role verification
- **Session Security**: HTTP-only approach with token-based authentication

### Key Features Architecture
- **Emergency System**: Real-time emergency activation with location tracking
- **Report Management**: CRUD operations for incident reports with status workflow
- **Zone Management**: Dynamic unsafe zone creation with automatic risk level calculation
- **Map Integration**: Interactive maps with zone visualization and click-to-report functionality
- **Responsive Design**: Mobile-first approach with adaptive UI components

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: TypeScript-first ORM with PostgreSQL dialect

### Frontend Libraries
- **UI Components**: Radix UI primitives for accessible component foundation
- **Maps**: Leaflet.js for interactive mapping with OpenStreetMap tiles
- **State Management**: TanStack React Query for server state caching
- **Form Management**: React Hook Form with Zod schema validation
- **Styling**: Tailwind CSS with class-variance-authority for component variants

### Authentication & Security
- **JWT**: JSON Web Tokens for stateless authentication
- **bcrypt**: Password hashing and validation
- **connect-pg-simple**: PostgreSQL session store integration

### Development Tools
- **Vite**: Fast build tool with HMR and TypeScript support
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer
- **TypeScript**: Static type checking across the entire stack

### Fonts & Assets
- **Google Fonts**: Inter font family for consistent typography
- **Replit Integration**: Development banner and cartographer plugins