require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

// Import database (which auto-initializes and seeds table data)
require('./config/database');

// Import Controllers
const blogController = require('./controllers/blogController');
const adminController = require('./controllers/adminController');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ryzennodes_vps_blog_secret_key_9988!',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false // Set to true if deploying over HTTPS
    }
  })
);

// Global Variables middleware (makes 'user' session available in all EJS templates)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ==============================================
// 1. PUBLIC BLOG ROUTES
// ==============================================
app.get('/', blogController.getHome);
app.get('/blog', (req, res) => res.redirect('/')); // Redirect alias
app.get('/blog/:slug', blogController.getPostBySlug);

// ==============================================
// 2. ADMIN AUTHENTICATION ROUTES
// ==============================================
app.get('/admin/login', adminController.getLogin);
app.post('/admin/login', adminController.postLogin);
app.get('/admin/logout', adminController.logout);

// ==============================================
// 3. PROTECTED ADMIN OPERATIONS (CRUD)
// ==============================================
app.get('/admin', adminController.requireAuth, adminController.getDashboard);
app.get('/admin/new', adminController.requireAuth, adminController.getCreate);
app.post('/admin/new', adminController.requireAuth, adminController.postCreate);
app.get('/admin/edit/:id', adminController.requireAuth, adminController.getEdit);
app.post('/admin/edit/:id', adminController.requireAuth, adminController.postEdit);
app.post('/admin/delete/:id', adminController.requireAuth, adminController.postDelete);

// ==============================================
// 4. 404 AND ERROR HANDLING
// ==============================================
app.use((req, res, next) => {
  res.status(404).render('index', {
    title: '404 - Page Not Found | RyzenNodes Blog',
    posts: [],
    featuredPost: null,
    categories: [],
    activeCategory: '',
    searchQuery: '',
    user: req.session.user || null,
    error: 'The page you are looking for does not exist.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` RyzenNodes Blog Platform successfully started!`);
  console.log(` Portal address: http://localhost:${PORT}`);
  console.log(` Admin Portal:   http://localhost:${PORT}/admin`);
  console.log(` Default Admin:  admin / AdminPass123!`);
  console.log(`==================================================`);
});

module.exports = app; // For testing
