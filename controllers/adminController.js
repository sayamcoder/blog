const { dbQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

// Simple helper to slugify title if slug is empty
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

// Helper to compute read time based on word count (200 words per minute)
function calculateReadTime(content) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

const adminController = {
  // Authentication middleware
  requireAuth(req, res, next) {
    if (req.session && req.session.user) {
      next();
    } else {
      res.redirect('/admin/login');
    }
  },

  // GET /admin/login - Render login form
  getLogin(req, res) {
    if (req.session && req.session.user) {
      return res.redirect('/admin');
    }
    res.render('login', {
      title: 'Admin Login | RyzenNodes',
      error: req.query.error || null,
      user: null
    });
  },

  // POST /admin/login - Authenticate admin
  async postLogin(req, res) {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.redirect('/admin/login?error=Please enter all fields');
    }

    try {
      const user = await dbQuery.get('SELECT * FROM users WHERE username = ?', [username]);
      
      if (!user) {
        return res.redirect('/admin/login?error=Invalid credentials');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.redirect('/admin/login?error=Invalid credentials');
      }

      // Store user in session
      req.session.user = {
        id: user.id,
        username: user.username
      };

      res.redirect('/admin');
    } catch (error) {
      console.error('Login error:', error);
      res.redirect('/admin/login?error=An error occurred during authentication');
    }
  },

  // GET /admin/logout - Clear session
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) console.error('Logout session destruction error:', err);
      res.redirect('/admin/login');
    });
  },

  // GET /admin - Display management dashboard (List posts)
  async getDashboard(req, res) {
    try {
      const posts = await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC');
      
      res.render('dashboard', {
        title: 'Admin Dashboard | RyzenNodes',
        posts,
        mode: 'list',
        postToEdit: null,
        error: req.query.error || null,
        success: req.query.success || null,
        user: req.session.user
      });
    } catch (error) {
      console.error('Error fetching dashboard posts:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // GET /admin/new - Render post creation form (within dashboard view)
  async getCreate(req, res) {
    try {
      const posts = await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC');
      res.render('dashboard', {
        title: 'Create New Post | RyzenNodes Admin',
        posts,
        mode: 'create',
        postToEdit: null,
        error: null,
        success: null,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin?error=Failed to open creation form');
    }
  },

  // POST /admin/new - Handle post creation
  async postCreate(req, res) {
    let { title, slug, content, category, read_time, author, cover_image } = req.body;

    if (!title || !content || !category || !author) {
      return res.render('dashboard', {
        title: 'Create New Post | RyzenNodes Admin',
        posts: await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC'),
        mode: 'create',
        postToEdit: null,
        error: 'Please fill in all required fields (Title, Content, Category, Author)',
        success: null,
        user: req.session.user
      });
    }

    try {
      // Auto generate slug if empty
      if (!slug || slug.trim() === '') {
        slug = slugify(title);
      } else {
        slug = slugify(slug);
      }

      // Check if slug is unique
      const existingPost = await dbQuery.get('SELECT id FROM posts WHERE slug = ?', [slug]);
      if (existingPost) {
        return res.render('dashboard', {
          title: 'Create New Post | RyzenNodes Admin',
          posts: await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC'),
          mode: 'create',
          postToEdit: { title, slug, content, category, read_time, author, cover_image },
          error: `A post with slug "${slug}" already exists. Please choose a different title or slug.`,
          success: null,
          user: req.session.user
        });
      }

      // Compute read time if not provided
      const finalReadTime = read_time ? parseInt(read_time, 10) : calculateReadTime(content);

      await dbQuery.run(
        `INSERT INTO posts (title, slug, content, category, read_time, author, cover_image) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, slug, content, category, finalReadTime, author, cover_image || null]
      );

      res.redirect('/admin?success=Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      res.redirect('/admin/new?error=Database error while creating post');
    }
  },

  // GET /admin/edit/:id - Render post edit form (within dashboard view)
  async getEdit(req, res) {
    const id = req.params.id;
    try {
      const posts = await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC');
      const postToEdit = await dbQuery.get('SELECT * FROM posts WHERE id = ?', [id]);

      if (!postToEdit) {
        return res.redirect('/admin?error=Post not found');
      }

      res.render('dashboard', {
        title: `Edit Post: ${postToEdit.title} | RyzenNodes Admin`,
        posts,
        mode: 'edit',
        postToEdit,
        error: null,
        success: null,
        user: req.session.user
      });
    } catch (error) {
      console.error('Error loading edit form:', error);
      res.redirect('/admin?error=Error fetching post details');
    }
  },

  // POST /admin/edit/:id - Handle post update
  async postEdit(req, res) {
    const id = req.params.id;
    let { title, slug, content, category, read_time, author, cover_image } = req.body;

    if (!title || !content || !category || !author) {
      return res.render('dashboard', {
        title: 'Edit Post | RyzenNodes Admin',
        posts: await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC'),
        mode: 'edit',
        postToEdit: { id, title, slug, content, category, read_time, author, cover_image },
        error: 'Please fill in all required fields (Title, Content, Category, Author)',
        success: null,
        user: req.session.user
      });
    }

    try {
      if (!slug || slug.trim() === '') {
        slug = slugify(title);
      } else {
        slug = slugify(slug);
      }

      // Check if slug is unique to another post
      const existingPost = await dbQuery.get('SELECT id FROM posts WHERE slug = ? AND id != ?', [slug, id]);
      if (existingPost) {
        return res.render('dashboard', {
          title: 'Edit Post | RyzenNodes Admin',
          posts: await dbQuery.all('SELECT * FROM posts ORDER BY created_at DESC'),
          mode: 'edit',
          postToEdit: { id, title, slug, content, category, read_time, author, cover_image },
          error: `A post with slug "${slug}" already exists. Please choose a different title or slug.`,
          success: null,
          user: req.session.user
        });
      }

      const finalReadTime = read_time ? parseInt(read_time, 10) : calculateReadTime(content);

      await dbQuery.run(
        `UPDATE posts 
         SET title = ?, slug = ?, content = ?, category = ?, read_time = ?, author = ?, cover_image = ? 
         WHERE id = ?`,
        [title, slug, content, category, finalReadTime, author, cover_image || null, id]
      );

      res.redirect('/admin?success=Post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      res.redirect(`/admin/edit/${id}?error=Database error while updating post`);
    }
  },

  // POST /admin/delete/:id - Handle post deletion
  async postDelete(req, res) {
    const id = req.params.id;
    try {
      const post = await dbQuery.get('SELECT title FROM posts WHERE id = ?', [id]);
      if (!post) {
        return res.redirect('/admin?error=Post not found');
      }

      await dbQuery.run('DELETE FROM posts WHERE id = ?', [id]);
      res.redirect(`/admin?success=Post "${post.title}" deleted successfully.`);
    } catch (error) {
      console.error('Error deleting post:', error);
      res.redirect('/admin?error=Database error while deleting post');
    }
  }
};

module.exports = adminController;
