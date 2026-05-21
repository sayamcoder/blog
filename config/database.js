const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../blog.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Promise wrappers for SQLite callback-based API
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize database schema
async function initDb() {
  try {
    // 1. Create posts table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        read_time INTEGER NOT NULL,
        author TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cover_image TEXT
      )
    `);
    console.log('Posts table initialized.');

    // 2. Create users table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);
    console.log('Users table initialized.');

    // 3. Seed default administrator
    const adminUsername = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASS || 'AdminPass123!';
    
    const adminExists = await dbQuery.get('SELECT * FROM users WHERE username = ?', [adminUsername]);
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await dbQuery.run('INSERT INTO users (username, password) VALUES (?, ?)', [
        adminUsername,
        hashedPassword
      ]);
      console.log(`Seeded default admin user: ${adminUsername}`);
    }

    // 4. Seed default RyzenNodes blog posts for dynamic content on startup
    const postCount = await dbQuery.get('SELECT COUNT(*) as count FROM posts');
    if (postCount.count === 0) {
      const samplePosts = [
        {
          title: 'Demystifying KVM VPS: Why Kernel-based Virtual Machines Rule Hosting',
          slug: 'demystifying-kvm-vps-benefits',
          category: 'Tutorials',
          read_time: 5,
          author: 'RyzenNodes Engineering',
          cover_image: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
          content: `Virtualization has revolutionized server deployment. At RyzenNodes, all our instances run on pure **KVM (Kernel-based Virtual Machine)** virtualization. 

But what makes KVM so much better than OpenVZ or LXC? Let's dive in.

## What is KVM Virtualization?

KVM is an open-source virtualization technology built into the Linux kernel. It turns Linux into a hypervisor, allowing a host machine to run multiple isolated virtual environments called virtual machines (VMs).

\`\`\`bash
# Check if your processor supports hardware virtualization
egrep -c '(vmx|svm)' /proc/cpuinfo
\`\`\`

### Key Benefits of KVM:
1. **Dedicated Resources:** Unlike container virtualization, KVM allocates dedicated RAM, CPU, and disk space. No "overselling" can affect your performance.
2. **Custom Kernels:** Run any OS, including custom Linux distros, FreeBSD, or Windows, with full control over kernel modules.
3. **Advanced Security:** KVM uses SELinux and sVirt to isolate virtual machines, ensuring that a compromised VM cannot breach the host or other instances.

### Typical KVM CPU Topologies on Ryzen 9 7950X
At RyzenNodes, we combine KVM with AMD Ryzen 9 7950X host nodes. Here is a configuration snippet showing how CPUs are isolated:

\`\`\`xml
<vcpu placement='static'>4</vcpu>
<cpu mode='host-passthrough'>
  <topology sockets='1' dies='1' cores='4' threads='1'/>
</cpu>
\`\`\`

If you're running heavy databases, API services, or game servers, choosing KVM ensures your performance remains predictable and stable.`
        },
        {
          title: 'Unleashing AMD Ryzen 9 7950X: The Engine Behind Our Hosting Nodes',
          slug: 'unleashing-amd-ryzen-9-7950x-power',
          category: 'Hardware',
          read_time: 6,
          author: 'AMD Fanboy / Admin',
          cover_image: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&w=1200&q=80',
          content: `In the hosting industry, single-core speed is often overlooked in favor of core count. However, for database transactions, gaming servers, and compiled workloads, **single-core frequency** is the ultimate performance driver.

That's why RyzenNodes chooses the **AMD Ryzen 9 7950X** processor for our premium VPS nodes.

## Ryzen 9 7950X Specifications

- **Cores / Threads:** 16 Cores / 32 Threads
- **Base Clock:** 4.5 GHz
- **Max Boost Clock:** 5.7 GHz
- **L3 Cache:** 64 MB
- **Architecture:** Zen 4 (5nm TSMC)

### Benchmarking Performance

Here is a simple Node.js benchmark to test execution times for mathematical computations. Notice how Ryzen cores complete it in milliseconds compared to standard Xeon cores:

\`\`\`javascript
// Fibonacci recursion benchmark
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.time('Ryzen Execution Time');
const result = fibonacci(40);
console.log('Result:', result);
console.timeEnd('Ryzen Execution Time');
// Expected execution time: ~600ms on Zen 4 vs ~1400ms on older Xeon
\`\`\`

### Liquid Cooled Infrastructure
High frequency brings high thermal demands. RyzenNodes servers are housed in enterprise cabinets equipped with premium cooling solutions, maintaining temperatures below 75°C under full load. This ensures the processors stay in their boost state longer, delivering uninterrupted power to your VPS.`
        },
        {
          title: 'Configuring NGINX as a Reverse Proxy with SSL on RyzenNodes',
          slug: 'nginx-reverse-proxy-ssl-setup',
          category: 'Tutorials',
          read_time: 4,
          author: 'System Operations Team',
          cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
          content: `Deploying a Node.js or Python application on a VPS is only the first step. To make it ready for production, you should run it behind a robust reverse proxy like **NGINX** and secure it using **SSL certificates** from Let's Encrypt.

This tutorial guides you through configuring NGINX on Ubuntu 22.04 running on your RyzenNodes VPS.

## Step 1: Install NGINX

First, update your package index and install NGINX:

\`\`\`bash
sudo apt update
sudo apt install nginx -y
\`\`s

## Step 2: Configure Reverse Proxy

Create a server configuration file for your domain:

\`\`\`bash
sudo nano /etc/nginx/sites-available/app.example.com
\`\`\`

Paste the following configuration, replacing \`app.example.com\` with your domain and \`3000\` with your app's port:

\`\`\`nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

Enable the configuration by creating a symlink:

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/app.example.com /etc/nginx/sites-enabled/
sudo systemctl restart nginx
\`\`\`

## Step 3: Secure with Let's Encrypt Certbot

Install Certbot and request an SSL certificate:

\`\`\`bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d app.example.com
\`\`\`

Follow the prompts to enable auto-redirects. Certbot will automatically edit your NGINX files to serve traffic securely over HTTPS!`
        }
      ];

      for (const post of samplePosts) {
        await dbQuery.run(
          `INSERT INTO posts (title, slug, content, category, read_time, author, cover_image) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [post.title, post.slug, post.content, post.category, post.read_time, post.author, post.cover_image]
        );
      }
      console.log('Sample blog posts seeded successfully.');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize tables on load
initDb();

module.exports = {
  db,
  dbQuery
};
