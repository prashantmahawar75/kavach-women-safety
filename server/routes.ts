import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertReportSchema, insertUnsafeZoneSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "kavach-secret-key-2024";

// Extend Express Request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    claims?: any;
  };
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin only middleware
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      // Check for hardcoded admin credentials
      if (username === 'prashant75' && password === 'prashant232323') {
        const token = jwt.sign(
          { id: 'admin', username: 'prashant75', role: 'admin' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return res.json({
          token,
          user: { id: 'admin', username: 'prashant75', role: 'admin', fullName: 'Admin' }
        });
      }

      // Regular user authentication
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        role: 'user'
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.id === 'admin') {
        // Return admin user info
        return res.json({
          id: 'admin',
          username: 'prashant75',
          fullName: 'Admin',
          role: 'admin'
        });
      }

      const user = await storage.getUserById(req.user?.id || '');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        emergencyContact: user.emergencyContact,
        role: user.role
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/auth/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('Profile update request received for user:', req.user?.id);
      console.log('Request body:', req.body);

      if (req.user?.id === 'admin') {
        return res.status(400).json({ message: 'Admin profile cannot be updated' });
      }

      const { fullName, phone, emergencyContact } = req.body;
      
      if (!fullName || !phone || !emergencyContact) {
        console.log('Missing required fields:', { fullName: !!fullName, phone: !!phone, emergencyContact: !!emergencyContact });
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate user exists
      const existingUser = await storage.getUserById(req.user?.id || '');
      if (!existingUser) {
        console.log('User not found:', req.user?.id);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('Updating user profile...');
      const updatedUser = await storage.updateUserProfile(req.user?.id || '', {
        fullName,
        phone,
        emergencyContact
      });

      console.log('Profile updated successfully:', updatedUser.id);
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        emergencyContact: updatedUser.emergencyContact,
        role: updatedUser.role
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reports routes
  app.post('/api/reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportData = insertReportSchema.parse({
        ...req.body,
        userId: req.user?.id
      });
      
      const report = await storage.createReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/reports', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role === 'admin') {
        const reports = await storage.getAllReports();
        res.json(reports);
      } else {
        const reports = await storage.getUserReports(req.user?.id || '');
        res.json(reports);
      }
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/reports/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteReport(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/reports/:id/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      await storage.updateReportStatus(req.params.id, status);
      res.status(204).send();
    } catch (error) {
      console.error('Update report status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/reports/:id/approve', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Update report status to approved
      const updatedReport = await storage.updateReportStatus(req.params.id, 'approved');

      // Create or update unsafe zone based on report location
      if (report.latitude && report.longitude) {
        await storage.createOrUpdateZone({
          name: `${report.incidentType} Zone`,
          latitude: report.latitude,
          longitude: report.longitude,
          radius: 100,
        });
      }

      res.json(updatedReport);
    } catch (error) {
      console.error('Approve report error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Users routes (admin only)
  app.get('/api/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Unsafe zones routes
  app.get('/api/zones', async (req, res) => {
    try {
      const zones = await storage.getZonesWithReportCounts();
      res.json(zones);
    } catch (error) {
      console.error('Get zones error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/zones', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const zoneData = insertUnsafeZoneSchema.parse(req.body);
      const zone = await storage.createUnsafeZone(zoneData);
      res.status(201).json(zone);
    } catch (error) {
      console.error('Create zone error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/zones/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteUnsafeZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete zone error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Emergency endpoint (mock)
  app.post('/api/emergency', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { latitude, longitude } = req.body;
      
      // Mock emergency services
      console.log(`🚨 EMERGENCY ALERT for user ${req.user?.username}`);
      console.log(`📍 Location: ${latitude}, ${longitude}`);
      console.log(`📞 Calling police...`);
      console.log(`📱 Notifying emergency contact...`);
      console.log(`📨 Sending SMS with location...`);
      
      res.json({ 
        success: true, 
        message: 'Emergency services activated',
        services: {
          police: 'contacted',
          emergencyContact: 'notified',
          sms: 'sent'
        }
      });
    } catch (error) {
      console.error('Emergency error:', error);
      res.status(500).json({ message: 'Emergency service error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
