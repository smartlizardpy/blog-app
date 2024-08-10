import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

// Middleware to serve static files
app.use(express.static(__dirname));

// Middleware to parse JSON request bodies
app.use(express.json());

// Function to fetch users data from local JSON file
async function fetchUsersData() {
  try {
    console.log('Fetching users data from local JSON file');
    const data = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8');
    const users = JSON.parse(data);
    console.log('Users data fetched successfully:', users);
    return users;
  } catch (error) {
    console.error('Error in fetchUsersData:', error);
    throw error;
  }
}

// Function to save users data to the local JSON file
async function saveUsersData(users) {
  try {
    console.log('Saving users data to local JSON file');
    fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2));
    console.log('Users data saved successfully');
  } catch (error) {
    console.error('Error in saveUsersData:', error);
    throw error;
  }
}

// Function to fetch blog data for a specific user from a local JSON file
async function fetchBlogData(filename) {
  try {
    const filePath = path.join(__dirname, filename);
    console.log(`Fetching blog data from ${filePath}`);
    const data = fs.readFileSync(filePath, 'utf-8');
    const blogData = JSON.parse(data);
    console.log('Blog data fetched successfully:', blogData);
    return blogData;
  } catch (error) {
    console.error('Error in fetchBlogData:', error);
    throw error;
  }
}

// Function to save blog data to a local JSON file
async function saveBlogData(filename, blogs) {
  try {
    const filePath = path.join(__dirname, filename);
    console.log(`Saving blog data to ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(blogs, null, 2));
    console.log('Blog data saved successfully');
  } catch (error) {
    console.error('Error in saveBlogData:', error);
    throw error;
  }
}

// Function to add "Read More" link to post content
function cut(content, username, title, length = 300) {
  if (content.length > length) {
    const preview = content.slice(0, length);
    return `${marked(preview)}<a href="/${username}/post/${title}">Read More...</a>`;
  }
  return marked(content);
}

// Route to serve the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Route to serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Route to handle requests for specific user blogs
app.get('/:username/', async (req, res) => {
  const username = req.params.username;

  try {
    console.log(`Handling request for user ${username}`);
    const users = await fetchUsersData();
    const user = users.find(user => user.name === username);

    if (user) {
      const postsData = await fetchBlogData(user.file);
      
      // Sort posts by date (newest first)
      postsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Get the first post author
      const firstPostAuthor = postsData[0]?.author || user.name;
      
      const postHtml = postsData.map(post => `
        <article>
          <img src="${post.image}" alt="${post.title}" class="post-image2">
          <div class="post-content">${cut(post.content, user.name, post.title)}</div>
          <div class="post-meta">
            <time>${post.timestamp}</time>
            <div class="post-author">by ${post.author}</div>
          </div>
        </article>
      `).join('');
      res.render('index.pug', { posts: postHtml, name: firstPostAuthor, desc: user.desc });
    } else {
      console.log(`User not found: ${username}`);
      res.status(404).send('<h1>User Not Found</h1>');
    }
  } catch (error) {
    console.error('Error in route /:username/', error);
    res.status(500).send('<h1>Internal Server Error</h1>');
  }
});

// Route to handle individual post requests
app.get('/:username/post/:title', async (req, res) => {
  const username = req.params.username;
  const title = req.params.title;

  console.log(`Handling request for post ${title} of user ${username}`);

  try {
    const users = await fetchUsersData();
    const user = users.find(user => user.name === username);

    if (user) {
      const postsData = await fetchBlogData(user.file);
      const post = postsData.find(post => post.title === title);

      if (post) {
        const { image, content, timestamp, author } = post;
        console.log(`Rendering post ${title}`);
        const postHtml = `
          <article>
            <img src="${image}" alt="${title}" class="post-image2">
            <div class="post-content">${marked(content)}</div>
            <div class="post-meta">
              <time>${timestamp}</time>
              <div class="post-author">by ${author}</div>
            </div>
          </article>
        `;
        res.render('post.pug', { posts: postHtml, name: post.author, desc: user.desc, postn:title , url:username});
      } else {
        console.log(`Post not found: ${title}`);
        res.status(404).send('<h1>Post Not Found</h1>');
      }
    } else {
      console.log(`User not found: ${username}`);
      res.status(404).send('<h1>User Not Found</h1>');
    }
  } catch (error) {
    console.error('Error in route /:username/post/:title', error);
    res.status(500).send('<h1>Internal Server Error</h1>');
  }
});

// API to add a new user
app.post('/api/add_user', async (req, res) => {
  const newUser = req.body;

  try {
    const users = await fetchUsersData();
    users.push(newUser);
    await saveUsersData(users);

    // Create an empty JSON file for the new user's blogs
    fs.writeFileSync(path.join(__dirname, newUser.file), JSON.stringify([]));
    res.status(200).json({ message: 'User added successfully' });
  } catch (error) {
    console.error('Error in API /api/add_user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API to add a new blog post for a specific user
app.post('/api/add_blog/:username', async (req, res) => {
  const username = req.params.username;
  const newPost = req.body;

  try {
    const users = await fetchUsersData();
    const user = users.find(user => user.name === username);

    if (user) {
      const postsData = await fetchBlogData(user.file);
      postsData.push(newPost);
      await saveBlogData(user.file, postsData);
      res.status(200).json({ message: 'Blog post added successfully' });
    } else {
      console.log(`User not found: ${username}`);
      res.status(404).json({ error: 'User Not Found' });
    }
  } catch (error) {
    console.error('Error in API /api/add_blog/:username:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API to get all blog posts for a specific user
app.get('/api/get_blogs/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const users = await fetchUsersData();
    const user = users.find(user => user.name === username);

    if (user) {
      const postsData = await fetchBlogData(user.file);
      res.status(200).json(postsData);
    } else {
      console.log(`User not found: ${username}`);
      res.status(404).json({ error: 'User Not Found' });
    }
  } catch (error) {
    console.error('Error in API /api/get_blogs/:username:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
