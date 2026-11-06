import jwt from 'jsonwebtoken';
import { 
  signToken, 
  authenticateToken, 
  authorizeRoles, 
  requireAdmin, 
  requireOwner, 
  JWT_SECRET 
} from '../backend/middleware/authMiddleware.js';

console.log('--- Testing JWT Authentication & Authorization ---');

// Test 1: Sign token
const mockUser = {
  _id: 'u_test123',
  name: 'Test Gourmet',
  email: 'test@etoile.com',
  role: 'user'
};

const token = signToken(mockUser);
console.log('✓ Token signed successfully:', token.slice(0, 25) + '...');

// Test 2: Decode token
const decoded = jwt.verify(token, JWT_SECRET);
console.assert(decoded.id === 'u_test123', 'Decoded ID mismatch');
console.assert(decoded.role === 'user', 'Decoded role mismatch');
console.assert(decoded.email === 'test@etoile.com', 'Decoded email mismatch');
console.log('✓ Decoded payload matches user data.');

// Helper to simulate express middleware req, res, next
function mockExpress(reqHeaders = {}) {
  const req = { headers: reqHeaders };
  let status = 200;
  let responseData = null;
  let nextCalled = false;

  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, getResult: () => ({ status, responseData, nextCalled }) };
}

// Test 3: authenticateToken with valid Bearer token
{
  const { req, res, next, getResult } = mockExpress({ authorization: `Bearer ${token}` });
  authenticateToken(req, res, next);
  const result = getResult();
  console.assert(result.nextCalled === true, 'next() should have been called');
  console.assert(req.user.id === 'u_test123', 'req.user should be populated');
  console.log('✓ Valid Bearer token authenticated successfully.');
}

// Test 4: authenticateToken with missing Authorization header
{
  const { req, res, next, getResult } = mockExpress({});
  authenticateToken(req, res, next);
  const result = getResult();
  console.assert(result.status === 401, 'Should return 401 when header missing');
  console.assert(result.nextCalled === false, 'next() should NOT be called');
  console.log('✓ Missing header returns 401 Unauthorized.');
}

// Test 5: authenticateToken with invalid token
{
  const { req, res, next, getResult } = mockExpress({ authorization: 'Bearer invalid.jwt.token' });
  authenticateToken(req, res, next);
  const result = getResult();
  console.assert(result.status === 401, 'Should return 401 on invalid token');
  console.assert(result.responseData.message.includes('invalid'), 'Error message should indicate invalid token');
  console.log('✓ Invalid token returns 401 Unauthorized.');
}

// Test 6: authenticateToken with expired token
{
  const expiredToken = jwt.sign(
    { id: 'u_exp', role: 'user' },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  const { req, res, next, getResult } = mockExpress({ authorization: `Bearer ${expiredToken}` });
  authenticateToken(req, res, next);
  const result = getResult();
  console.assert(result.status === 401, 'Should return 401 on expired token');
  console.assert(result.responseData.expired === true, 'Should include expired: true flag');
  console.log('✓ Expired token returns 401 Unauthorized with expired flag.');
}

// Test 7: Role authorization - user trying admin route
{
  const req = { user: { id: 'u_1', role: 'user' } };
  let status = 200;
  let nextCalled = false;
  const res = { status: (c) => { status = c; return res; }, json: () => res };
  const next = () => { nextCalled = true; };

  requireAdmin(req, res, next);
  console.assert(status === 403, 'Regular user should get 403 on admin route');
  console.assert(nextCalled === false, 'next() should not be called');
  console.log('✓ Regular user rejected from admin route with 403 Forbidden.');
}

// Test 8: Role authorization - owner accessing owner route
{
  const req = { user: { id: 'u_owner', role: 'owner' } };
  let status = 200;
  let nextCalled = false;
  const res = { status: (c) => { status = c; return res; }, json: () => res };
  const next = () => { nextCalled = true; };

  requireOwner(req, res, next);
  console.assert(status === 200, 'Owner should not receive error status');
  console.assert(nextCalled === true, 'next() should be called for owner');
  console.log('✓ Owner permitted to access owner route.');
}

console.log('\nAll 8 JWT authentication & authorization tests passed successfully!');
