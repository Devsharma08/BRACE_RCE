import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express, Request, Response } from 'express';

/**
 * Swagger/OpenAPI configuration for API documentation.
 * Generates docs from JSDoc comments in route files.
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BRACE RCE API',
      version: process.env.npm_package_version || '1.0.0',
      description: `
BRACE (Browser-based Real-time Algorithmic Coding Environment) API Documentation

## Overview
This API provides endpoints for:
- User authentication (signup, signin, OAuth)
- Code execution with Piston sandbox
- Real-time coding battles via Socket.io
- Problem management and learning paths
- Friend system and messaging
- Analytics and leaderboards

## Authentication
Most endpoints require authentication via HTTP-only cookie.
Include \`credentials: 'include'\` in fetch requests.

## CSRF Protection
Mutating requests (POST/PUT/DELETE/PATCH) require \`x-csrf-token\` header.
Get token from \`GET /api/v1/csrf-token\` on app initialization.

## Rate Limiting
- Auth endpoints: 25 requests / 15 minutes per IP
- Code execution: 15 requests / minute per IP
- Socket.io: 50 events / second per connection

## Versioning
API version is in the URL path: \`/api/v1/...\`
Legacy \`/api/...\` routes are maintained for backward compatibility.
      `,
      contact: {
        name: 'BRACE Team',
        email: 'support@brace.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_MODE === 'production' 
          ? 'https://api.brace.dev' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_MODE === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token in HTTP-only cookie',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token for mutating requests',
        },
      },
      schemas: {
        // Common response wrapper
        ApiResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success', 'error'] },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        // User
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            bio: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'MODERATOR'] },
            rating: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Auth
        SignupRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 64 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            avatarUrl: { type: 'string', format: 'uri' },
          },
        },
        SigninRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string' },
          },
        },
        // Code Execution
        ExecuteCodeRequest: {
          type: 'object',
          required: ['code', 'language'],
          properties: {
            code: { type: 'string', maxLength: 100000 },
            language: { type: 'string', enum: ['javascript', 'python', 'java', 'cpp', 'c'] },
            oid: { type: 'string' },
            mode: { type: 'string', enum: ['RUN', 'SUBMIT'], default: 'RUN' },
            customInput: { type: 'string' },
            roomId: { type: 'string' },
          },
        },
        ExecuteCodeResponse: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            output: { type: 'string' },
            passed: { type: 'boolean' },
            runtimeMs: { type: 'integer' },
            memoryKb: { type: 'integer' },
          },
        },
        // Problem
        Problem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            problemNumber: { type: 'integer', nullable: true },
            githubOid: { type: 'string', nullable: true },
            difficultyLevel: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
            problemDefinition: { type: 'string' },
            problemHints: { type: 'array', items: { type: 'string' } },
            isCustom: { type: 'boolean' },
            timeLimitMs: { type: 'integer' },
            testCases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  input: { type: 'string' },
                  expectedOutput: { type: 'string' },
                  isPublic: { type: 'boolean' },
                },
              },
            },
          },
        },
        // Battle
        BattleRoom: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['FRIENDS', 'BOT', 'PUBLIC', 'ONE_VS_ONE', 'CUSTOM', 'TOURNAMENT'] },
            status: { type: 'string', enum: ['WAITING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'DISSOLVED'] },
            hostId: { type: 'string', format: 'uuid' },
            roomCode: { type: 'string' },
            maxUsers: { type: 'integer' },
            problems: {
              type: 'array',
              items: { $ref: '#/components/schemas/Problem' },
            },
          },
        },
        // Analytics
        UserAnalytics: {
          type: 'object',
          properties: {
            totalBattles: { type: 'integer' },
            wins: { type: 'integer' },
            losses: { type: 'integer' },
            winRate: { type: 'number', format: 'float' },
            averageRating: { type: 'integer' },
            currentStreak: { type: 'integer' },
            bestStreak: { type: 'integer' },
            totalTimeSpentMs: { type: 'integer' },
            languageStats: { type: 'object' },
          },
        },
        // Leaderboard
        LeaderboardEntry: {
          type: 'object',
          properties: {
            rank: { type: 'integer' },
            userId: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            rating: { type: 'integer' },
            totalBattles: { type: 'integer' },
          },
        },
        // Friend
        FriendRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            senderId: { type: 'string', format: 'uuid' },
            receiverId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Feedback
        FeedbackRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
          },
        },
        // Pagination
        PaginationParams: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
            sortBy: { type: 'string' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
      },
    },
    security: [
      { cookieAuth: [] },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Code Execution', description: 'Run and submit code' },
      { name: 'Problems', description: 'Problem management and learning' },
      { name: 'Battles/Rooms', description: 'Real-time coding battles' },
      { name: 'Friends', description: 'Friend system and messaging' },
      { name: 'Analytics', description: 'User analytics and leaderboards' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Feedback', description: 'User feedback' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI and JSON endpoint
 */
export function setupSwagger(app: Express): void {
  // JSON spec endpoint
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2563eb; }
    `,
    customSiteTitle: 'BRACE RCE API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  }));

  console.log('[swagger] Documentation available at /api-docs');
}

export { swaggerSpec };
export default setupSwagger;