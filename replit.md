# Project Overview

A simple Node.js/TypeScript Express API server.

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express 5

## Project Structure

```
backend/
  index.ts    - Main Express server entry point
package.json  - Project dependencies and scripts
tsconfig.json - TypeScript configuration
```

## Running the Project

- **Development**: `npm run dev` - Runs the TypeScript server directly using ts-node/esm
- **Production**: `npm run start` - Same as dev for now

## API Endpoints

- `GET /` - Returns welcome message
- `GET /health` - Health check endpoint

## Notes

- Server binds to `0.0.0.0:5000` to work with Replit's proxy
- Uses ES modules (`"type": "module"` in package.json)
