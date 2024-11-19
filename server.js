const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 4000;

// Middleware to parse JSON data
app.use(express.json());

// MongoDB connection string
const uri = "mongodb+srv://forumUser:alpHa43@cluster0.pynmp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(error => console.error('MongoDB connection error:', error));

// Define Reply Schema
const replySchema = new mongoose.Schema({
    text: String,
    user: { type: String, default: 'Anonymous' },
    createdAt: { type: Date, default: Date.now }
});

// Define Comment Schema
const commentSchema = new mongoose.Schema({
    text: String,
    user: { type: String, default: 'Anonymous' },
    createdAt: { type: Date, default: Date.now },
    replies: [replySchema]
});

// Define Post Schema and Model
const postSchema = new mongoose.Schema({
    username: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
    comments: [commentSchema] // Embed comments
});

const Post = mongoose.model('Post', postSchema);

// Route to create a new post
app.post('/api/posts', async (req, res) => {
    try {
        const newPost = new Post({
            username: req.body.username,
            content: req.body.content
        });
        await newPost.save();

        io.emit('newPost', newPost); // Broadcast new post
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

// Route to get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ timestamp: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to retrieve posts' });
    }
});

// Route to add a comment to a post
app.post('/api/posts/:postId/comments', async (req, res) => {
    const { postId } = req.params;
    const { text, user } = req.body;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const newComment = { text, user: user || 'Anonymous', createdAt: new Date() };
        post.comments.push(newComment);
        await post.save();

        io.emit('newComment', { postId, comment: newComment }); // Broadcast new comment
        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// Route to add a reply to a comment
app.post('/api/posts/:postId/comments/:commentId/replies', async (req, res) => {
    const { postId, commentId } = req.params;
    const { text, user } = req.body;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const newReply = { text, user: user || 'Anonymous', createdAt: new Date() };
        comment.replies.push(newReply);
        await post.save();

        io.emit('newReply', { postId, commentId, reply: newReply }); // Broadcast new reply
        res.status(201).json(newReply);
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ message: 'Failed to add reply' });
    }
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

