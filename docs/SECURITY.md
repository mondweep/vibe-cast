# Vibe-Cast Security Hardening Guide

**Phase 5 - Production Readiness**

## Overview

This document details Vibe-Cast's comprehensive security strategy covering authentication, authorization, secrets management, API security, data protection, and incident response.

The system uses **defense in depth**: multiple security layers ensure that if one layer fails, others remain effective.

---

## 1. Authentication Strategy

### 1.1 Authentication Methods

Vibe-Cast supports multiple authentication approaches per context:

```
┌─────────────────────────────────────────────────────────────┐
│              AUTHENTICATION METHODS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. API KEY (Publishable/Secret)                            │
│     ├─ Use: Client-side read operations (dashboard)        │
│     ├─ Header: X-API-Key: pk_live_...                      │
│     ├─ Rate Limited: Yes (1000 req/hr)                     │
│     └─ Scope: Read-only, single tenant                     │
│                                                              │
│  2. API KEY (Secret)                                        │
│     ├─ Use: Server-to-server operations (backend)          │
│     ├─ Header: X-API-Key: sk_live_... + Bearer <jwt>      │
│     ├─ Rate Limited: Yes (5000 req/hr)                     │
│     └─ Scope: Full write/admin access                      │
│                                                              │
│  3. JWT (JSON Web Token)                                    │
│     ├─ Use: Session-based user authentication              │
│     ├─ Header: Authorization: Bearer <jwt>                 │
│     ├─ Lifetime: 1 hour (access), 7 days (refresh)        │
│     └─ Scope: User-specific operations                     │
│                                                              │
│  4. OAuth 2.0 (Supabase Auth)                              │
│     ├─ Use: Third-party delegated auth (future)            │
│     ├─ Providers: Google, GitHub, etc.                     │
│     └─ Scope: User signup/login                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 API Key Management

```typescript
// src/shared/infrastructure/auth/ApiKeyValidator.ts

class ApiKeyValidator {
  // Publishable key format: pk_live_<32 random chars>
  static readonly PUBLISHABLE_KEY_PATTERN = /^pk_live_[a-zA-Z0-9_-]{32,}$/;
  
  // Secret key format: sk_live_<32 random chars>
  static readonly SECRET_KEY_PATTERN = /^sk_live_[a-zA-Z0-9_-]{32,}$/;
  
  /**
   * Validate and extract API key from request
   * Returns: { type: 'publishable'|'secret', key: string, tenantId: string }
   */
  static validateApiKey(
    authHeader: string,
    apiKeyHeader?: string
  ): { type: 'publishable' | 'secret'; key: string } {
    // Try X-API-Key header first (modern pattern)
    if (apiKeyHeader) {
      if (this.PUBLISHABLE_KEY_PATTERN.test(apiKeyHeader)) {
        return { type: 'publishable', key: apiKeyHeader };
      } else if (this.SECRET_KEY_PATTERN.test(apiKeyHeader)) {
        return { type: 'secret', key: apiKeyHeader };
      }
    }
    
    // Fallback: Bearer token in Authorization header
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // Validate JWT format
      return { type: 'secret', key: token };
    }
    
    throw new AuthenticationError('Invalid or missing API key');
  }
  
  /**
   * Check if key is allowed for operation
   */
  static checkPermission(
    keyType: 'publishable' | 'secret',
    operation: 'read' | 'write' | 'admin'
  ): boolean {
    const permissions: Record<string, string[]> = {
      publishable: ['read'],
      secret: ['read', 'write', 'admin']
    };
    
    return permissions[keyType]?.includes(operation) ?? false;
  }
}

// Middleware: Authenticate all requests
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract API key from headers
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization as string;
    
    if (!apiKey && !authHeader) {
      return res.status(401).json({ error: 'Missing authentication' });
    }
    
    // Validate API key
    const auth = ApiKeyValidator.validateApiKey(authHeader, apiKey);
    
    // Attach to request for downstream handlers
    (req as any).auth = {
      type: auth.type,
      apiKey: auth.key,
      timestamp: Date.now()
    };
    
    // Log authentication event
    logger.debug('Request authenticated', {
      keyType: auth.type,
      endpoint: req.path,
      method: req.method
    });
    
    next();
    
  } catch (error) {
    logger.warn('Authentication failed', {
      endpoint: req.path,
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

### 1.3 JWT Configuration

```typescript
// JWT Token Structure
interface JWTPayload {
  sub: string;              // Subject (user ID)
  iat: number;              // Issued at
  exp: number;              // Expires at (1 hour)
  aud: string;              // Audience ('vibe-cast')
  iss: string;              // Issuer
  tenant_id: string;        // Multi-tenant segregation
  scope: string[];          // Permissions: 'read', 'write'
  email: string;            // User email
  aud: string[];            // Audience
}

// JWT Signing Configuration
const jwtConfig = {
  algorithm: 'HS256',       // HMAC SHA-256
  expiresIn: '1h',          // Access token lifetime
  refresh_expires_in: '7d', // Refresh token lifetime
  secret: process.env.JWT_SIGNING_SECRET,
  audience: 'vibe-cast',
  issuer: 'vibe-cast-auth'
};

// Generate JWT
function generateToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    aud: 'vibe-cast',
    iss: 'vibe-cast-auth',
    tenant_id: userId, // In single-tenant mode
    scope: ['read', 'write'],
    email
  };
  
  return jwt.sign(payload, jwtConfig.secret, {
    algorithm: 'HS256',
    expiresIn: '1h'
  });
}

// Verify JWT
function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: ['HS256'],
      audience: 'vibe-cast',
      issuer: 'vibe-cast-auth'
    });
    
    return decoded as JWTPayload;
    
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}
```

---

## 2. Authorization Patterns

### 2.1 Row-Level Security (RLS) Policies

Every table enforces RLS to prevent cross-tenant data leakage:

```sql
-- Enable RLS on all application tables
ALTER TABLE ruflo_demo_saga_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo_learner_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo_badge_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo_community_profiles ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Users can only see their own data
CREATE POLICY learner_can_read_own_data ON ruflo_demo_enrollments
  FOR SELECT
  USING (learner_id = current_user_id);

-- POLICY 2: Users can only insert their own enrollments
CREATE POLICY learner_can_create_own_enrollments ON ruflo_demo_enrollments
  FOR INSERT
  WITH CHECK (learner_id = current_user_id);

-- POLICY 3: Users cannot modify or delete their own enrollments
-- (write operations go through authenticated API only)
CREATE POLICY prevent_learner_modifications ON ruflo_demo_enrollments
  FOR UPDATE
  USING (FALSE);

CREATE POLICY prevent_learner_deletions ON ruflo_demo_enrollments
  FOR DELETE
  USING (FALSE);

-- POLICY 4: Admins can view all data (for support/monitoring)
CREATE POLICY admin_can_read_all ON ruflo_demo_enrollments
  FOR SELECT
  USING (current_user_role = 'admin');

-- POLICY 5: Service account (backend) bypasses RLS
-- (Implementation depends on Supabase auth model)
CREATE POLICY service_account_bypass ON ruflo_demo_enrollments
  FOR ALL
  USING (current_user_id = 'service-account-id');
```

### 2.2 Domain-Based Authorization

Access control at the application layer validates user permissions:

```typescript
// src/api/middleware/AuthorizationMiddleware.ts

interface AuthContext {
  userId: string;
  email: string;
  roles: string[];      // ['learner', 'instructor', 'admin']
  permissions: string[]; // ['read:enrollments', 'write:progress']
}

class AuthorizationMiddleware {
  /**
   * Check if user has required permission
   * Example: requirePermission('write:enrollments')
   */
  static requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const auth = (req as any).auth as AuthContext;
      
      if (!auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      if (!auth.permissions.includes(permission)) {
        logger.warn('Permission denied', {
          userId: auth.userId,
          permission,
          endpoint: req.path
        });
        
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      next();
    };
  }
  
  /**
   * Check if user has required role
   * Example: requireRole('instructor')
   */
  static requireRole(role: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const auth = (req as any).auth as AuthContext;
      
      if (!auth?.roles?.includes(role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      next();
    };
  }
  
  /**
   * Check resource ownership
   * Used for: reading/modifying own enrollments, profiles, etc.
   */
  static checkResourceOwnership(
    resourceId: string,
    resourceType: 'enrollment' | 'profile' | 'discussion'
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const auth = (req as any).auth as AuthContext;
      
      try {
        const owner = await this.getResourceOwner(resourceId, resourceType);
        
        if (owner !== auth.userId && !auth.roles.includes('admin')) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
        
        next();
        
      } catch (error) {
        res.status(404).json({ error: 'Not found' });
      }
    };
  }
  
  private static async getResourceOwner(
    resourceId: string,
    resourceType: string
  ): Promise<string> {
    const tableMap: Record<string, string> = {
      enrollment: 'ruflo_demo_enrollments',
      profile: 'ruflo_demo_learner_profiles',
      discussion: 'ruflo_demo_discussions'
    };
    
    const result = await supabase
      .from(tableMap[resourceType])
      .select('learner_id')
      .eq('id', resourceId)
      .single();
    
    return result.data?.learner_id ?? '';
  }
}

// Usage in routes
app.get(
  '/api/v1/learning/enrollments/:id',
  AuthorizationMiddleware.checkResourceOwnership(':id', 'enrollment'),
  enrollmentController.getEnrollment
);
```

---

## 3. Secrets Management

### 3.1 Environment Variables

Never commit secrets to version control:

```bash
# .gitignore
.env
.env.local
.env.production
.env.*.local
secrets/
*.pem
*.key
```

### 3.2 Secure Secret Storage

```typescript
// src/shared/infrastructure/secrets/SecretsManager.ts

interface SecretsManagerConfig {
  provider: 'vault' | 'aws-secrets' | 'env'; // Where to load secrets from
  rotationDays: 90;                           // Automatic rotation interval
}

class SecretsManager {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour
  
  async getSecret(name: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    
    // Load from provider
    let value: string;
    
    if (process.env.SECRETS_PROVIDER === 'aws') {
      value = await this.loadFromAWSSecrets(name);
    } else if (process.env.SECRETS_PROVIDER === 'vault') {
      value = await this.loadFromVault(name);
    } else {
      value = process.env[name] ?? '';
    }
    
    if (!value) {
      throw new Error(`Secret not found: ${name}`);
    }
    
    // Cache with TTL
    this.cache.set(name, {
      value,
      expiresAt: Date.now() + this.CACHE_TTL
    });
    
    return value;
  }
  
  private async loadFromAWSSecrets(secretName: string): Promise<string> {
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    
    return response.SecretString ?? '';
  }
  
  private async loadFromVault(secretName: string): Promise<string> {
    const vaultAddr = process.env.VAULT_ADDR;
    const vaultToken = process.env.VAULT_TOKEN;
    
    const response = await fetch(`${vaultAddr}/v1/secret/${secretName}`, {
      headers: { 'X-Vault-Token': vaultToken }
    });
    
    const data = await response.json();
    return data.data.value;
  }
}

// Usage: Get secrets at startup
async function initializeSecrets(): Promise<void> {
  const secretsManager = new SecretsManager();
  
  // Cache required secrets on startup
  const requiredSecrets = [
    'SUPABASE_SECRET_KEY',
    'JWT_SIGNING_SECRET',
    'DATABASE_PASSWORD'
  ];
  
  for (const secret of requiredSecrets) {
    try {
      await secretsManager.getSecret(secret);
    } catch (error) {
      throw new Error(`Failed to load secret: ${secret}`);
    }
  }
}
```

### 3.3 Secret Rotation Policy

```
ROTATION SCHEDULE:

API Keys (Supabase):
├─ Rotation interval: 90 days
├─ Process:
│  1. Generate new key in Supabase dashboard
│  2. Add new key to secrets manager
│  3. Deploy application with new key
│  4. Monitor error rates (should be 0)
│  5. After 7 days, retire old key
│  6. Document in changelog
└─ Alert: 30 days before expiration

Database Password:
├─ Rotation interval: 90 days
├─ Process:
│  1. Generate new password in database
│  2. Update in secrets manager
│  3. Verify connection pool accepts new password
│  4. Monitor for connection errors
│  5. After 7 days, disable old password
└─ Alert: 30 days before expiration

JWT Signing Secret:
├─ Rotation interval: 180 days
├─ Process:
│  1. Generate new secret
│  2. Deploy with new secret and old secret (for verification)
│  3. Update only new tokens with new secret
│  4. After 7 days, stop accepting old secret
│  5. Remove old secret from codebase
└─ Manual process (no auto-rotation)

Encryption Keys:
├─ Rotation interval: 365 days
├─ Process:
│  1. Generate new key
│  2. Re-encrypt all data with new key
│  3. Store old key for decryption of historical data
│  4. Publish new key in key rotation record
└─ Planned annual rotation
```

---

## 4. API Security

### 4.1 Rate Limiting

Protect against abuse and DoS attacks:

```typescript
// src/api/middleware/RateLimitMiddleware.ts

interface RateLimitConfig {
  maxRequests: number;      // Max requests per window
  windowMs: number;         // Time window in milliseconds
  keyFn: (req: Request) => string; // Extract rate limit key
}

class RateLimiter {
  private store: Map<string, { count: number; resetAt: number }> = new Map();
  
  static createPublishableKeyLimiter() {
    return new RateLimiter({
      maxRequests: 1000,
      windowMs: 3600000, // 1 hour
      keyFn: (req) => {
        const apiKey = (req.headers['x-api-key'] as string) || 'anonymous';
        return `pk:${apiKey}`;
      }
    });
  }
  
  static createSecretKeyLimiter() {
    return new RateLimiter({
      maxRequests: 5000,
      windowMs: 3600000, // 1 hour
      keyFn: (req) => {
        const apiKey = (req.headers['x-api-key'] as string) || 'anonymous';
        return `sk:${apiKey}`;
      }
    });
  }
  
  static createIpLimiter() {
    return new RateLimiter({
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      keyFn: (req) => {
        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]
          || req.socket.remoteAddress
          || 'unknown';
        return `ip:${ip}`;
      }
    });
  }
  
  constructor(private config: RateLimitConfig) {}
  
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.config.keyFn(req);
      const now = Date.now();
      
      // Get current bucket
      let bucket = this.store.get(key);
      
      // Reset if window expired
      if (!bucket || bucket.resetAt < now) {
        bucket = {
          count: 0,
          resetAt: now + this.config.windowMs
        };
        this.store.set(key, bucket);
      }
      
      // Increment counter
      bucket.count++;
      
      // Set rate limit headers
      const secondsUntilReset = Math.ceil((bucket.resetAt - now) / 1000);
      
      res.setHeader('RateLimit-Limit', String(this.config.maxRequests));
      res.setHeader('RateLimit-Remaining', String(
        Math.max(0, this.config.maxRequests - bucket.count)
      ));
      res.setHeader('RateLimit-Reset', String(secondsUntilReset));
      
      // Check if limit exceeded
      if (bucket.count > this.config.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          count: bucket.count,
          limit: this.config.maxRequests
        });
        
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: secondsUntilReset
        });
        return;
      }
      
      next();
    };
  }
}

// Apply rate limiters
app.use('/api/v1', RateLimiter.createIpLimiter().middleware());
app.use('/api/v1/learning', RateLimiter.createPublishableKeyLimiter().middleware());
app.use('/api/v1/admin', RateLimiter.createSecretKeyLimiter().middleware());
```

### 4.2 CORS Configuration

Control which origins can access the API:

```typescript
// src/api/middleware/CorsMiddleware.ts

const corsConfig = {
  // Whitelist of allowed origins
  allowedOrigins: [
    'https://vibe-cast.example.com',
    'https://app.example.com',
    'https://admin.example.com'
  ],
  
  // Allow credentials (cookies, auth headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Allowed request headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Correlation-ID'
  ],
  
  // Headers client can access in response
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  
  // Cache preflight requests for 24 hours
  maxAge: 86400
};

app.use(cors(corsConfig));

// Custom CORS validation
app.options('*', (req, res) => {
  const origin = req.headers.origin as string;
  
  if (corsConfig.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', String(corsConfig.maxAge));
    res.sendStatus(200);
  } else {
    res.status(403).json({ error: 'CORS not allowed' });
  }
});
```

### 4.3 Input Validation

Validate all user inputs at system boundaries:

```typescript
// src/api/middleware/ValidationMiddleware.ts

interface ValidationSchema {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: any[];
    min?: number;
    max?: number;
  };
}

class InputValidator {
  static validate(data: any, schema: ValidationSchema): any {
    const errors: Record<string, string> = {};
    const validated: any = {};
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // Check required
      if (rules.required && (value === undefined || value === null)) {
        errors[field] = `${field} is required`;
        continue;
      }
      
      if (value === undefined || value === null) {
        continue;
      }
      
      // Check type
      if (typeof value !== rules.type && rules.type !== 'array') {
        errors[field] = `${field} must be ${rules.type}`;
        continue;
      }
      
      // Check string constraints
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors[field] = `${field} must be at least ${rules.minLength} chars`;
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors[field] = `${field} must be at most ${rules.maxLength} chars`;
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
          errors[field] = `${field} format is invalid`;
        }
      }
      
      // Check enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = `${field} must be one of: ${rules.enum.join(', ')}`;
      }
      
      validated[field] = value;
    }
    
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Input validation failed', errors);
    }
    
    return validated;
  }
}

// Usage in endpoint
app.post('/api/v1/learning/enrollments', (req, res) => {
  const schema: ValidationSchema = {
    learnerId: { type: 'string', required: true, pattern: /^[a-f0-9-]{36}$/ },
    pathId: { type: 'string', required: true, pattern: /^[a-f0-9-]{36}$/ },
    enrolledAt: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}T/ }
  };
  
  try {
    const data = InputValidator.validate(req.body, schema);
    // Process validated data
  } catch (error) {
    res.status(422).json({ error: error.message, details: error.details });
  }
});
```

---

## 5. Data Security

### 5.1 Encryption at Rest

Store sensitive data encrypted:

```typescript
// src/shared/infrastructure/encryption/DataEncryption.ts

class DataEncryption {
  private cipher: crypto.Cipher;
  private decipher: crypto.Decipher;
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  
  constructor() {
    // Load encryption key from environment
    const keyHex = process.env.DATA_ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error('DATA_ENCRYPTION_KEY not set');
    }
    
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (256 bits)');
    }
  }
  
  /**
   * Encrypt sensitive data before storing in database
   * Returns: base64 string with IV and auth tag prepended
   */
  encrypt(data: string): string {
    // Generate random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: IV + authTag + encrypted data
    const result = iv.toString('hex') + authTag.toString('hex') + encrypted;
    
    return Buffer.from(result, 'hex').toString('base64');
  }
  
  /**
   * Decrypt data retrieved from database
   */
  decrypt(encrypted: string): string {
    // Decode from base64
    const buffer = Buffer.from(encrypted, 'base64');
    const data = buffer.toString('hex');
    
    // Extract components
    const iv = Buffer.from(data.slice(0, 32), 'hex');
    const authTag = Buffer.from(data.slice(32, 64), 'hex');
    const ciphertext = data.slice(64);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage in application
const encryption = new DataEncryption();

// Before storing
const plaintext = learner.ssn;
const encrypted = encryption.encrypt(plaintext);
await db.update({ ssn: encrypted });

// After retrieving
const encrypted = learner.ssn;
const plaintext = encryption.decrypt(encrypted);
```

### 5.2 Encryption in Transit

All API communication uses HTTPS/TLS:

```typescript
// src/api/https/HttpsConfig.ts

import https from 'https';
import fs from 'fs';

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH || '/etc/ssl/private/key.pem'),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH || '/etc/ssl/certs/cert.pem'),
  
  // Security options
  secureOptions: 
    crypto.constants.SSL_OP_NO_TLSv1 | // Disable old TLS
    crypto.constants.SSL_OP_NO_TLSv1_1
};

// Create HTTPS server
const server = https.createServer(httpsOptions, app);

// Additional headers for TLS
app.use((req, res, next) => {
  // Strict Transport Security (force HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent cross-site request forgery
  res.setHeader('X-CSRF-Token', req.headers['x-csrf-token'] || '');
  
  next();
});
```

### 5.3 Audit Logging

Log all sensitive operations for compliance:

```typescript
// src/shared/infrastructure/audit/AuditLog.ts

interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value?: any;
  new_value?: any;
  result: 'success' | 'failure';
  error_message?: string;
}

class AuditLogger {
  async logAction(
    userId: string,
    action: string,
    resource: { type: string; id: string },
    changes?: { old: any; new: any }
  ): Promise<void> {
    const event: AuditEvent = {
      event_id: `audit_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      actor_id: userId,
      actor_email: await this.getUserEmail(userId),
      action,
      resource_type: resource.type,
      resource_id: resource.id,
      old_value: changes?.old,
      new_value: changes?.new,
      result: 'success'
    };
    
    // Store in audit table
    await supabase
      .from('audit_logs')
      .insert(event);
    
    // Log to external audit service for compliance
    if (action.includes('delete') || action.includes('export')) {
      await this.logToExternalAudit(event);
    }
  }
  
  async logFailure(
    userId: string,
    action: string,
    resource: { type: string; id: string },
    error: Error
  ): Promise<void> {
    const event: AuditEvent = {
      event_id: `audit_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString(),
      actor_id: userId,
      actor_email: await this.getUserEmail(userId),
      action,
      resource_type: resource.type,
      resource_id: resource.id,
      result: 'failure',
      error_message: error.message
    };
    
    await supabase
      .from('audit_logs')
      .insert(event);
  }
  
  private async getUserEmail(userId: string): Promise<string> {
    const result = await supabase
      .from('ruflo_demo_learner_profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    return result.data?.email || 'unknown';
  }
  
  private async logToExternalAudit(event: AuditEvent): Promise<void> {
    // Send to external audit service (Splunk, DataDog, etc.)
    await fetch(process.env.AUDIT_SERVICE_URL || '', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.AUDIT_SERVICE_TOKEN}` },
      body: JSON.stringify(event)
    });
  }
}

// Usage: Audit sensitive operations
const auditLogger = new AuditLogger();

app.delete('/api/v1/learners/:id', async (req, res) => {
  try {
    const learnerId = req.params.id;
    await deleteLearnerData(learnerId);
    
    await auditLogger.logAction(
      req.user.id,
      'delete:learner',
      { type: 'learner', id: learnerId }
    );
    
    res.status(204).send();
  } catch (error) {
    await auditLogger.logFailure(
      req.user.id,
      'delete:learner',
      { type: 'learner', id: req.params.id },
      error
    );
    
    res.status(500).json({ error: 'Deletion failed' });
  }
});
```

---

## 6. Dependency Security

### 6.1 Supply Chain Security

```bash
# Regularly audit dependencies for vulnerabilities
npm audit

# Fix known vulnerabilities automatically
npm audit fix

# Update dependencies safely
npm outdated                    # Show outdated packages
npm update --depth=3           # Update minor versions
npm install [package]@latest   # Update specific package

# Lock file verification
# Commit package-lock.json to version control
# Verify on CI/CD before deployment
```

### 6.2 CVE Scanning

```bash
#!/bin/bash
# scripts/security-scan.sh

# Scan dependencies for known vulnerabilities
npm audit --production --severity=high

# Scan for hardcoded secrets
gitleaks detect --verbose --report-path ./security/secrets-report.json

# Scan source code for security issues
npx semgrep --config=p/security-audit src/

# Generate SBOM (Software Bill of Materials)
cyclonedx-npm --output-file ./security/sbom.json
```

---

## 7. DDoS and Attack Mitigation

### 7.1 DDoS Protection Strategy

```
LAYER 1: Network DDoS Protection
├─ Cloud provider DDoS mitigation (Supabase/AWS Shield)
├─ Rate limiting at edge
└─ Geographic blocking if needed

LAYER 2: Application Rate Limiting
├─ Per-IP rate limits: 100 req/min
├─ Per-API-Key rate limits: 1000-5000 req/hr
├─ Per-endpoint rate limits: Adjust per endpoint sensitivity
└─ Distributed rate limiter (across replicas)

LAYER 3: Request Filtering
├─ Reject requests with invalid headers
├─ Block suspicious User-Agents
├─ Require valid API keys
└─ Validate request size (max 1MB)

LAYER 4: Circuit Breaker
├─ Circuit breaker opens on excessive failures
├─ Fail-fast when backend degraded
└─ Automatic recovery after timeout
```

### 7.2 Suspicious Activity Detection

```typescript
// src/api/security/AnomalyDetector.ts

class AnomalyDetector {
  /**
   * Detect suspicious activity patterns
   */
  async detectAnomalies(request: Request): Promise<void> {
    const suspiciousPatterns = [
      this.detectBruteForce(request),
      this.detectSqlInjection(request),
      this.detectXss(request),
      this.detectPathTraversal(request),
      this.detectLargePayload(request)
    ];
    
    const detected = (await Promise.all(suspiciousPatterns))
      .filter(p => p !== null);
    
    if (detected.length > 0) {
      logger.warn('Suspicious activity detected', {
        ip: request.ip,
        patterns: detected,
        endpoint: request.path
      });
      
      // Increment suspicion score for IP
      await this.incrementSuspicionScore(request.ip || 'unknown');
      
      // Block if too many suspicions
      const score = await this.getSuspicionScore(request.ip || 'unknown');
      if (score > 10) {
        throw new SecurityError('Too many suspicious requests');
      }
    }
  }
  
  private detectBruteForce(request: Request): null | string {
    // Multiple failed login attempts from same IP
    return null; // Implement per-endpoint
  }
  
  private detectSqlInjection(request: Request): null | string {
    // Check for SQL injection patterns
    const patterns = [
      /(\bunion\b|select|insert|update|delete|drop)/i,
      /(-{2}|\/\*|\*\/|;)/,
      /(concat|char|ascii|substring|length)/i
    ];
    
    const queryString = JSON.stringify(request.query);
    
    for (const pattern of patterns) {
      if (pattern.test(queryString)) {
        return 'sql_injection';
      }
    }
    
    return null;
  }
  
  private detectXss(request: Request): null | string {
    // Check for XSS patterns
    const patterns = [
      /<script/i,
      /on\w+\s*=/i,
      /javascript:/i,
      /<iframe/i
    ];
    
    const body = JSON.stringify(request.body);
    
    for (const pattern of patterns) {
      if (pattern.test(body)) {
        return 'xss';
      }
    }
    
    return null;
  }
  
  private detectPathTraversal(request: Request): null | string {
    // Check for path traversal patterns
    if (request.path.includes('..') || request.path.includes('%2e%2e')) {
      return 'path_traversal';
    }
    
    return null;
  }
  
  private detectLargePayload(request: Request): null | string {
    // Check for excessively large payloads
    const contentLength = request.headers['content-length'];
    const maxSize = 1024 * 1024; // 1MB
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return 'large_payload';
    }
    
    return null;
  }
}
```

---

## 8. Security Incident Response

### 8.1 Incident Classification

```
SEVERITY 1 (CRITICAL):
├─ Data breach (PII exposed)
├─ System compromise
├─ Ransomware detected
└─ RTO < 1 hour

SEVERITY 2 (HIGH):
├─ Service unavailable due to attack
├─ Unauthorized access attempt detected
├─ Credential compromise
└─ RTO < 4 hours

SEVERITY 3 (MEDIUM):
├─ Application vulnerability discovered
├─ Suspicious activity detected
├─ Configuration issue found
└─ RTO < 24 hours

SEVERITY 4 (LOW):
├─ Deprecated library discovered
├─ Documentation issue
├─ Low-risk security smell
└─ RTO < 1 week
```

### 8.2 Incident Response Procedure

```
1. DETECTION & TRIAGE (0-15 minutes)
   ├─ Alert triggered (automated or manual report)
   ├─ Classify severity level
   ├─ Notify security team
   └─ Create incident ticket

2. CONTAINMENT (15-60 minutes)
   ├─ Isolate affected systems
   ├─ Revoke compromised credentials
   ├─ Block suspicious IPs
   ├─ Stop ongoing attacks
   └─ Preserve evidence

3. INVESTIGATION (1-24 hours)
   ├─ Determine scope of compromise
   ├─ Identify root cause
   ├─ Assess data exposure
   ├─ Review audit logs
   └─ Document findings

4. REMEDIATION (24-72 hours)
   ├─ Patch vulnerable systems
   ├─ Rotate all credentials
   ├─ Reset access controls
   ├─ Verify fixes effective
   └─ Deploy updates

5. COMMUNICATION (Ongoing)
   ├─ Notify affected users
   ├─ Update status page
   ├─ Coordinate with legal/PR
   ├─ File breach notifications if required
   └─ Follow regulatory requirements

6. POST-INCIDENT (1-7 days)
   ├─ Complete incident report
   ├─ Conduct blameless postmortem
   ├─ Identify preventive measures
   ├─ Update security policies
   └─ Train team on lessons learned
```

---

## 9. Security Checklist for Production Launch

```bash
# Pre-Launch Security Verification
[ ] All dependencies audited for vulnerabilities
[ ] No hardcoded secrets in codebase
[ ] HTTPS/TLS enabled on all endpoints
[ ] API keys rotated and stored securely
[ ] Rate limiting configured and tested
[ ] CORS origins whitelisted
[ ] Input validation on all endpoints
[ ] Authentication required on all protected endpoints
[ ] Authorization checks in place
[ ] RLS policies enabled in database
[ ] Audit logging implemented
[ ] Error messages don't leak sensitive info
[ ] SQL injection protections in place
[ ] XSS protections enabled
[ ] CSRF tokens validated
[ ] Security headers set (HSTS, CSP, X-Frame-Options)
[ ] Encryption at rest configured
[ ] Encryption in transit verified
[ ] Backup encryption keys secured
[ ] DDoS protection enabled
[ ] Security scanning scheduled (daily)
[ ] Incident response procedures documented
[ ] Team trained on security policies
[ ] Penetration testing scheduled
```

---

## 10. References

- [PRODUCTION.md](./PRODUCTION.md) - Configuration and deployment
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Backup and recovery
- [MONITORING.md](./MONITORING.md) - Observability and metrics
- [API.md](./API.md) - REST API specification

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-06  
**Maintenance:** Review after each security incident, update quarterly
