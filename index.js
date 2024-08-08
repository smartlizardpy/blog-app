import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { marked } from 'marked'; // Correct import for named export

function cut(text, postt) {
  // Check if the input text is longer than 120 characters
  if (text.length > 120) {
    // Return the first 120 characters
    const output = text.slice(0, 120) + '...  ' + '<a class="readmore" href="/post/' + postt + '">Read More</a>';
    return output;
  } else {
    // Return the text as is if it's 120 characters or less
    return text;
  }
}


// Create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Read and parse blog data from JSON file
const blogDataPath = path.join(__dirname, 'blog.json');

async function readBlogData() {
  const data = await fs.readFile(blogDataPath, 'utf-8');
  return JSON.parse(data);
}

const postsData = await readBlogData();

// Convert postsData to HTML with Markdown parsing
const postsHtml = postsData.map(post => {
  const { title, image, content, timestamp, author } = post;

  return `
<article>
    <img src="${image}" alt="${title}" class="post-image">
    <div class="post-content">${marked(cut(content,post.))} </div>
    <div class="post-meta">
        <time>${timestamp}</time>
        <div class="post-author">by ${author}</div>
        
    </div>
</article>
<hr>

`;
}).join('');

// Set up Pug as the templating engine
app.set('view engine', 'pug');
app.set('views', __dirname); // Main directory

// Serve static files
app.use(express.static(__dirname));

// Define routes
app.get('/', (req, res) => {
  res.render('index', { posts: postsHtml });
});

app.get('/post/:title', (req, res) => {
  const title = req.params.title;
  const post = postsData.find(post => post.title === title);

  if (post) {
    const { image, content, timestamp, author } = post;
    const postHtml = `
      <article>
        <img src="${image}" alt="${title}" class="post-image">
        <div class="post-content">${marked(content)}</div>
        <div class="post-meta">
          <time>${timestamp}</time>
          <div class="post-author">by ${author}</div>
        </div>
      </article>
    `;
    res.render('index', { posts: postHtml });
  } else {
    res.status(404).send('<h1>Post Not Found</h1>');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
