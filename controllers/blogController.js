const { dbQuery } = require('../config/database');
const { marked } = require('marked');

// Configure marked options if needed (optional)
marked.setOptions({
  gfm: true,
  breaks: true
});

const blogController = {
  // GET / or /blog - Homepage
  async getHome(req, res) {
    try {
      const search = req.query.q || '';
      const category = req.query.category || '';
      
      let query = 'SELECT * FROM posts';
      const params = [];
      const conditions = [];

      if (search) {
        conditions.push('(title LIKE ? OR content LIKE ? OR author LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Order by created_at descending (latest first)
      query += ' ORDER BY created_at DESC';

      const posts = await dbQuery.all(query, params);

      // Fetch all unique categories for the filter tabs
      const categoryRows = await dbQuery.all('SELECT DISTINCT category FROM posts');
      const categories = categoryRows.map(row => row.category);

      // Determine Featured Post
      // Option A: Latest announcement
      // Option B: Fallback to the latest post overall
      let featuredPost = null;
      let gridPosts = [...posts];

      if (!search && !category) {
        // Find latest post with Announcements category, or just the first post
        featuredPost = posts.find(p => p.category === 'Announcements') || posts[0] || null;
        if (featuredPost) {
          gridPosts = posts.filter(p => p.id !== featuredPost.id);
        }
      }

      res.render('index', {
        title: 'RyzenNodes Blog | Premium KVM VPS Hosting Insights',
        posts: gridPosts,
        featuredPost,
        categories,
        activeCategory: category,
        searchQuery: search,
        user: req.session.user || null
      });
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      res.status(500).send('Internal Server Error');
    }
  },

  // GET /blog/:slug - Single post view
  async getPostBySlug(req, res) {
    try {
      const slug = req.params.slug;
      const post = await dbQuery.get('SELECT * FROM posts WHERE slug = ?', [slug]);

      if (!post) {
        return res.status(404).render('index', {
          title: 'Post Not Found | RyzenNodes Blog',
          posts: [],
          featuredPost: null,
          categories: [],
          activeCategory: '',
          searchQuery: '',
          user: req.session.user || null,
          error: 'The requested article could not be found.'
        });
      }

      // Parse Markdown content to HTML
      const htmlContent = marked.parse(post.content);

      // Fetch up to 2 related articles (same category, excluding current post)
      let relatedPosts = await dbQuery.all(
        'SELECT * FROM posts WHERE category = ? AND id != ? ORDER BY created_at DESC LIMIT 2',
        [post.category, post.id]
      );

      // Fallback: If not enough related posts, fetch latest posts excluding current
      if (relatedPosts.length < 2) {
        const needed = 2 - relatedPosts.length;
        const excludedIds = [post.id, ...relatedPosts.map(p => p.id)];
        const placeholders = excludedIds.map(() => '?').join(',');
        
        const fallbackQuery = `
          SELECT * FROM posts 
          WHERE id NOT IN (${placeholders}) 
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        const fallbackParams = [...excludedIds, needed];
        const fallbacks = await dbQuery.all(fallbackQuery, fallbackParams);
        relatedPosts = [...relatedPosts, ...fallbacks];
      }

      res.render('post', {
        title: `${post.title} | RyzenNodes Blog`,
        post: { ...post, htmlContent },
        relatedPosts,
        user: req.session.user || null
      });
    } catch (error) {
      console.error('Error fetching blog post details:', error);
      res.status(500).send('Internal Server Error');
    }
  }
};

module.exports = blogController;
