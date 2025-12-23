const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static serve project files
app.use(express.static(path.join(__dirname)));

// Setup multer untuk file upload (in-memory for serverless)
const storage = process.env.VERCEL ? 
  multer.memoryStorage() : // Vercel: use memory storage
  multer.diskStorage({     // Local: use disk storage
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// API endpoint untuk upload file
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (process.env.VERCEL) {
      // For Vercel, return base64 data URL (temporary solution)
      const base64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
      
      res.json({ 
        success: true, 
        filename: req.file.originalname,
        originalName: req.file.originalname,
        url: dataUrl, // Return data URL instead of file path
        size: req.file.size,
        isDataUrl: true
      });
    } else {
      // Local development
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        success: true, 
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// API untuk hapus file (disabled in production)
app.delete('/uploads/:filename', (req, res) => {
  if (process.env.VERCEL) {
    return res.json({ success: true, message: 'File deletion not supported in production' });
  }
  
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'production' : 'development'
  });
});

// Function to get local IP address (for development)
function getLocalIP() {
  if (process.env.VERCEL) return 'production';
  
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
if (process.env.VERCEL) {
  // Export for Vercel
  module.exports = app;
} else {
  // Local development
  app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`🚀 Server jalan di:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://${localIP}:${PORT}`);
    console.log(`\n📱 Untuk akses dari HP, gunakan: http://${localIP}:${PORT}`);
  });
}