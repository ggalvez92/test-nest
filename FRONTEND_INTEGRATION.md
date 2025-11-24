# Frontend Integration Guide

Documentación completa para integrar la API de autenticación en tu aplicación frontend.

## Tabla de Contenidos

- [Configuración Inicial](#configuración-inicial)
- [Sistema de Autenticación](#sistema-de-autenticación)
- [Endpoints Disponibles](#endpoints-disponibles)
- [Ejemplos de Código](#ejemplos-de-código)
- [Manejo de Errores](#manejo-de-errores)
- [Flujos de Trabajo](#flujos-de-trabajo)

---

## Configuración Inicial

### URL Base

```typescript
const API_BASE_URL = 'http://localhost:3000'; // Desarrollo
// const API_BASE_URL = 'https://tu-dominio.com'; // Producción
```

### Tipos TypeScript

```typescript
// Enums
export enum SessionPlatform {
  WEB = 'WEB',
  MOBILE = 'MOBILE'
}

// Types
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
```

---

## Sistema de Autenticación

Esta API utiliza un sistema de autenticación basado en JWT con refresh tokens:

### Tipos de Tokens

1. **Access Token**
   - Duración: 15 minutos (configurable)
   - Uso: Autenticar requests a endpoints protegidos
   - Enviar en header: `Authorization: Bearer <accessToken>`

2. **Refresh Token**
   - Duración: 7 días (configurable)
   - Uso: Obtener nuevos access tokens sin re-login
   - Se envía en el body del endpoint `/auth/refresh`

### Sistema de Sesiones

- Cada login crea una nueva sesión independiente
- Puedes tener múltiples sesiones activas (diferentes dispositivos)
- Cada sesión se identifica por un `jti` (JWT ID) único
- Puedes cerrar sesión en dispositivos específicos o en todos a la vez

---

## Endpoints Disponibles

### 1. Registro de Usuario

**POST** `/auth/register`

Crea una nueva cuenta de usuario.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validaciones:**
- Email: Debe ser un email válido
- Password: Mínimo 8 caracteres

**Response 201:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errores:**
- `409`: Email ya registrado

---

### 2. Login

**POST** `/auth/login`

Inicia sesión y crea una nueva sesión de usuario.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "platform": "WEB",
  "deviceLabel": "Chrome on Windows"
}
```

**Campos:**
- `email` (requerido): Email del usuario
- `password` (requerido): Contraseña
- `platform` (requerido): `"WEB"` o `"MOBILE"`
- `deviceLabel` (opcional): Etiqueta descriptiva del dispositivo

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

**Errores:**
- `401`: Credenciales inválidas

---

### 3. Refrescar Tokens

**POST** `/auth/refresh`

Obtiene nuevos access y refresh tokens. Implementa rotación automática de tokens.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Importante:** El refresh token anterior queda invalidado. Siempre usa el nuevo refresh token recibido.

**Errores:**
- `401`: Refresh token inválido o expirado

---

### 4. Logout (Sesión Actual)

**POST** `/auth/logout`

Cierra la sesión actual del usuario.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "message": "Logged out successfully"
}
```

**Errores:**
- `401`: Token inválido o faltante
- `400`: Sesión no encontrada o ya cerrada

---

### 5. Logout de Otro Dispositivo

**POST** `/auth/logout-device`

Cierra sesión de otro dispositivo específico.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response 200:**
```json
{
  "message": "Device logged out successfully"
}
```

**Errores:**
- `401`: Token inválido
- `400`: Sesión no encontrada

---

### 6. Revocar Todas las Sesiones

**POST** `/auth/revoke`

Cierra todas las sesiones del usuario en todos los dispositivos.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "message": "All sessions revoked successfully"
}
```

**Errores:**
- `401`: Token inválido

---

### 7. Obtener Usuario Actual

**GET** `/users/me`

Obtiene la información del usuario autenticado.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errores:**
- `401`: Token inválido o faltante

---

## Ejemplos de Código

### Cliente API Base

```typescript
class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  clearAccessToken() {
    this.accessToken = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async register(email: string, password: string) {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(
    email: string,
    password: string,
    platform: SessionPlatform,
    deviceLabel?: string
  ) {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, platform, deviceLabel }),
    });

    this.setAccessToken(response.accessToken);
    return response;
  }

  async refresh(refreshToken: string) {
    const response = await this.request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    this.setAccessToken(response.accessToken);
    return response;
  }

  async logout() {
    const response = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });

    this.clearAccessToken();
    return response;
  }

  async logoutDevice(jti: string) {
    return this.request<{ message: string }>('/auth/logout-device', {
      method: 'POST',
      body: JSON.stringify({ jti }),
    });
  }

  async revokeAll() {
    const response = await this.request<{ message: string }>('/auth/revoke', {
      method: 'POST',
    });

    this.clearAccessToken();
    return response;
  }

  // User methods
  async getMe() {
    return this.request<User>('/users/me', {
      method: 'GET',
    });
  }
}

// Uso
const api = new ApiClient('http://localhost:3000');
```

---

### Servicio de Autenticación con Gestión de Tokens

```typescript
class AuthService {
  private api: ApiClient;
  private refreshToken: string | null = null;

  constructor(api: ApiClient) {
    this.api = api;
    this.loadTokens();
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.api.setAccessToken(accessToken);
    this.refreshToken = refreshToken;
  }

  private loadTokens() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken) {
      this.api.setAccessToken(accessToken);
    }

    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.api.clearAccessToken();
    this.refreshToken = null;
  }

  async register(email: string, password: string) {
    return this.api.register(email, password);
  }

  async login(
    email: string,
    password: string,
    deviceLabel?: string
  ) {
    const response = await this.api.login(
      email,
      password,
      SessionPlatform.WEB,
      deviceLabel
    );

    this.saveTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async logout() {
    try {
      await this.api.logout();
    } finally {
      this.clearTokens();
    }
  }

  async refreshTokens() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.api.refresh(this.refreshToken);
    this.saveTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async handleApiError(error: any) {
    // Si el error es 401, intentar refrescar el token
    if (error.message?.includes('401') && this.refreshToken) {
      try {
        await this.refreshTokens();
        return true; // Token refrescado, reintentar request
      } catch (refreshError) {
        this.clearTokens();
        // Redirigir al login
        window.location.href = '/login';
        return false;
      }
    }
    return false;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }
}

// Uso
const api = new ApiClient('http://localhost:3000');
const authService = new AuthService(api);
```

---

### Hook de React para Autenticación

```typescript
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string, deviceLabel?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password, deviceLabel) => {
    const response = await authService.login(email, password, deviceLabel);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  register: async (email, password) => {
    await authService.register(email, password);
  },

  refreshAuth: async () => {
    try {
      await authService.refreshTokens();
    } catch (error) {
      set({ user: null, isAuthenticated: false });
      throw error;
    }
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true });
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

---

### Interceptor para Auto-Refresh

```typescript
// Wrapper para requests con auto-refresh
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    return await api.request(endpoint, options);
  } catch (error: any) {
    // Si es 401, intentar refrescar
    if (error.message?.includes('401')) {
      const refreshed = await authService.handleApiError(error);

      if (refreshed) {
        // Reintentar request original
        return await api.request(endpoint, options);
      }
    }

    throw error;
  }
}
```

---

## Manejo de Errores

### Códigos de Estado Comunes

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| 200 | Éxito | Procesar respuesta |
| 201 | Creado exitosamente | Procesar respuesta |
| 400 | Request inválido | Mostrar mensaje de error al usuario |
| 401 | No autenticado | Refrescar token o redirigir a login |
| 404 | Recurso no encontrado | Mostrar mensaje al usuario |
| 409 | Conflicto (ej: email duplicado) | Mostrar mensaje específico |
| 500 | Error del servidor | Mostrar mensaje genérico |

### Ejemplo de Manejo de Errores

```typescript
async function handleRequest<T>(
  requestFn: () => Promise<T>
): Promise<T | null> {
  try {
    return await requestFn();
  } catch (error: any) {
    // Parse error message
    let errorMessage = 'An unexpected error occurred';

    if (error.message) {
      errorMessage = error.message;
    }

    // Handle specific error codes
    if (error.message.includes('401')) {
      errorMessage = 'Session expired. Please login again.';
      // Redirect to login
      window.location.href = '/login';
    } else if (error.message.includes('409')) {
      errorMessage = 'Email already exists';
    }

    // Show error to user (toast, alert, etc.)
    console.error(errorMessage);
    alert(errorMessage);

    return null;
  }
}

// Uso
const user = await handleRequest(() => api.getMe());
```

---

## Flujos de Trabajo

### 1. Flujo de Registro

```typescript
async function registerFlow(email: string, password: string) {
  try {
    // 1. Registrar usuario
    const user = await authService.register(email, password);
    console.log('User registered:', user);

    // 2. Hacer login automáticamente
    const authResponse = await authService.login(email, password);
    console.log('Logged in:', authResponse.user);

    // 3. Redirigir a dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Registration failed:', error);
  }
}
```

---

### 2. Flujo de Login

```typescript
async function loginFlow(email: string, password: string) {
  try {
    // 1. Hacer login
    const response = await authService.login(
      email,
      password,
      'Chrome on MacOS' // deviceLabel opcional
    );

    console.log('Logged in:', response.user);
    console.log('Tokens saved in localStorage');

    // 2. Redirigir a dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

---

### 3. Flujo de Auto-Login al Cargar la App

```typescript
async function initializeApp() {
  const authService = new AuthService(api);

  // Si hay token guardado, intentar obtener usuario
  if (authService.isAuthenticated()) {
    try {
      const user = await api.getMe();
      console.log('Auto-logged in:', user);
      return user;
    } catch (error) {
      // Si falla, intentar refrescar token
      try {
        await authService.refreshTokens();
        const user = await api.getMe();
        console.log('Token refreshed, logged in:', user);
        return user;
      } catch (refreshError) {
        // Si falla el refresh, borrar tokens y redirigir
        authService.logout();
        window.location.href = '/login';
      }
    }
  } else {
    // No hay tokens, redirigir a login
    window.location.href = '/login';
  }
}

// Llamar al iniciar la app
initializeApp();
```

---

### 4. Flujo de Refresh Automático

```typescript
// Configurar refresh automático antes de que expire el access token
function setupAutoRefresh() {
  // Access token expira en 15 minutos
  // Refrescar cada 14 minutos
  const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutos en ms

  setInterval(async () => {
    if (authService.isAuthenticated()) {
      try {
        await authService.refreshTokens();
        console.log('Token refreshed automatically');
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        window.location.href = '/login';
      }
    }
  }, REFRESH_INTERVAL);
}

// Iniciar después del login
setupAutoRefresh();
```

---

### 5. Flujo de Logout

```typescript
async function logoutFlow() {
  try {
    // 1. Llamar endpoint de logout
    await authService.logout();

    // 2. Tokens ya están borrados de localStorage
    console.log('Logged out successfully');

    // 3. Redirigir a login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
    // Aún así, limpiar tokens locales
    authService.logout();
    window.location.href = '/login';
  }
}
```

---

### 6. Flujo de Logout de Todos los Dispositivos

```typescript
async function logoutAllDevicesFlow() {
  try {
    // 1. Revocar todas las sesiones
    await api.revokeAll();

    // 2. Limpiar tokens locales
    authService.logout();

    console.log('All devices logged out');

    // 3. Redirigir a login
    window.location.href = '/login';
  } catch (error) {
    console.error('Revoke all failed:', error);
  }
}
```

---

## Seguridad y Mejores Prácticas

### 1. Almacenamiento de Tokens

```typescript
// ✅ BUENO: Guardar en localStorage (aceptable para SPAs)
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);

// ⚠️ MEJOR: Guardar refresh token en httpOnly cookie (requiere backend)
// El access token puede estar en memoria o localStorage
```

### 2. Envío de Tokens

```typescript
// ✅ SIEMPRE usar Authorization header
headers: {
  'Authorization': `Bearer ${accessToken}`
}

// ❌ NUNCA enviar en query params
// Mal: /api/users/me?token=xxx
```

### 3. Manejo de Expiración

```typescript
// ✅ SIEMPRE manejar expiración de tokens
try {
  const response = await api.getMe();
} catch (error) {
  if (is401Error(error)) {
    await authService.refreshTokens();
    // Retry request
  }
}
```

### 4. Logout Seguro

```typescript
// ✅ SIEMPRE limpiar tokens en logout
async logout() {
  await api.logout(); // Invalida sesión en servidor
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Redirigir a login
}
```

---

## Ejemplos de Integración con Frameworks

### React + Axios

```typescript
import axios, { AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          'http://localhost:3000/auth/refresh',
          { refreshToken }
        );

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### Next.js App Router

```typescript
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';

export async function login(email: string, password: string) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      platform: 'WEB',
    }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();

  // Guardar tokens en cookies httpOnly
  cookies().set('accessToken', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutos
  });

  cookies().set('refreshToken', data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return data.user;
}
```

---

## Testing

### Test de Login

```typescript
import { describe, it, expect } from 'vitest';

describe('Auth API', () => {
  it('should login successfully', async () => {
    const api = new ApiClient('http://localhost:3000');

    const response = await api.login(
      'test@example.com',
      'password123',
      SessionPlatform.WEB
    );

    expect(response).toHaveProperty('accessToken');
    expect(response).toHaveProperty('refreshToken');
    expect(response.user.email).toBe('test@example.com');
  });

  it('should refresh tokens', async () => {
    const api = new ApiClient('http://localhost:3000');

    // Login first
    const loginResponse = await api.login(
      'test@example.com',
      'password123',
      SessionPlatform.WEB
    );

    // Refresh tokens
    const refreshResponse = await api.refresh(loginResponse.refreshToken);

    expect(refreshResponse).toHaveProperty('accessToken');
    expect(refreshResponse).toHaveProperty('refreshToken');
  });
});
```

---

## Troubleshooting

### El token expira muy rápido

- Access token expira en 15 minutos por defecto
- Implementa refresh automático o manual antes de que expire
- El refresh token dura 7 días

### Error 401 constante

- Verifica que el token se envíe correctamente en el header `Authorization`
- Verifica que el formato sea `Bearer <token>`
- Intenta refrescar el token con el refresh token

### CORS errors

- Asegúrate de que el backend tenga CORS configurado correctamente
- El backend debe permitir el header `Authorization`

### Tokens no persisten después de reload

- Verifica que guardes los tokens en localStorage
- Implementa el flujo de auto-login al cargar la app

---

## Recursos Adicionales

### Swagger/OpenAPI

El backend incluye documentación Swagger. Accede en:

```
http://localhost:3000/api
```

### Variables de Entorno Recomendadas

```env
# Frontend .env
VITE_API_URL=http://localhost:3000
# o
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Contacto y Soporte

Para reportar problemas o hacer preguntas sobre la API, contacta al equipo de backend.
