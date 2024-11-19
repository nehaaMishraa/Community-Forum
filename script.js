// Event listener for creating a new post
document.getElementById('createPostForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent page reload on form submission

    // Get input values from the form
    const username = document.getElementById('username').value;
    const postContent = document.getElementById('postContent').value;

    // Send the post data to the server via a POST request
    const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, content: postContent })
    });

    if (response.ok) {
        fetchPosts(); // Refresh the posts
        document.getElementById('createPostForm').reset(); // Clear the form
    } else {
        console.error('Failed to create post');
    }
});

// Function to fetch and display all posts
async function fetchPosts() {
    try {
        const response = await fetch('/api/posts'); // GET request to fetch posts
        if (response.ok) {
            const posts = await response.json(); // Parse the JSON response
            const postsContainer = document.getElementById('posts');
            postsContainer.innerHTML = ''; // Clear current posts

            // Loop through each post and display it
            posts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.innerHTML = `
                    <h4>${post.username}</h4>
                    <p>${post.content}</p>
                    <small>${new Date(post.timestamp).toLocaleString()}</small>
                    <div class="comments">
                        <h5>Comments</h5>
                        <div id="comments-${post._id}"></div>
                        <form class="commentForm" data-post-id="${post._id}">
                            <input type="text" placeholder="Your Comment" required>
                            <button type="submit">Add Comment</button>
                        </form>
                    </div>
                `;
                postsContainer.appendChild(postElement);

                // Display existing comments for the post
                if (post.comments) {
                    post.comments.forEach(comment => {
                        addCommentToPost(post._id, comment);
                    });
                }
            });

            // Attach event listeners to all comment forms
            document.querySelectorAll('.commentForm').forEach(form => {
                form.addEventListener('submit', handleCommentSubmit);
            });
            
            
        } else {
            console.error('Failed to fetch posts');
        }
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

// Handle new comment submissions
async function handleCommentSubmit(event) {
    event.preventDefault();
    const postId = event.target.dataset.postId;
    const commentText = event.target.querySelector('input').value;

    const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: commentText, user: 'Anonymous' })
    });

    if (response.ok) {
        const comment = await response.json();
        addCommentToPost(postId, comment);
        event.target.reset();
    } else {
        console.error('Failed to add comment');
    }
}

// Add a comment to a post dynamically
function addCommentToPost(postId, comment) {
    const commentsContainer = document.getElementById(`comments-${postId}`);
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    commentElement.innerHTML = `
        <p>${comment.user}: ${comment.text}</p>
        <small>${new Date(comment.createdAt).toLocaleString()}</small>
    `;
    commentsContainer.appendChild(commentElement);
}

// Real-time updates for new posts and comments
const socket = io(); // Initialize Socket.IO
socket.on('newPost', post => {
    fetchPosts(); // Refresh the posts dynamically
});

socket.on('newComment', ({ postId, comment }) => {
    addCommentToPost(postId, comment);
});

// Initial call to fetch posts when the page loads
fetchPosts();
