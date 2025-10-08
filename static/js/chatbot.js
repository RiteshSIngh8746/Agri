document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    // Exit if chatbot elements aren't on this page
    if (!chatForm) return;

    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        // 1. Display user's message immediately
        appendMessage(userMessage, 'user-message');
        chatInput.value = '';

        try {
            // 2. Send the message to the backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) throw new Error('Network response was not ok.');

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // 3. Display the bot's response
            appendMessage(data.response, 'bot-message');

        } catch (error) {
            console.error('Chatbot Error:', error);
            appendMessage('Sorry, an error occurred. Please try again.', 'bot-message');
        }
    });

    function appendMessage(message, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;

        const p = document.createElement('p');
        p.textContent = message;
        messageDiv.appendChild(p);

        chatWindow.appendChild(messageDiv);
        // Scroll to the newest message
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
});