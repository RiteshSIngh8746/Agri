function openTab(evt, tabName) {
    // Get all elements with class="tab-content" and hide them
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tab-link" and remove the class "active"
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Code for CHATBOT visibility
document.addEventListener('DOMContentLoaded', () => {
    const chatbotFab = document.getElementById('chatbot-fab');
    const chatbotOverlay = document.getElementById('chatbot-overlay');
    const closeChatbotBtn = document.getElementById('close-chatbot-btn');

    if (chatbotFab && chatbotOverlay && closeChatbotBtn) {
        // Show chatbot when floating button is clicked
        chatbotFab.addEventListener('click', () => {
            chatbotOverlay.classList.remove('hidden');
        });

        // Hide chatbot when close button is clicked
        closeChatbotBtn.addEventListener('click', () => {
            chatbotOverlay.classList.add('hidden');
        });

        // Hide chatbot when clicking on the dark background overlay
        chatbotOverlay.addEventListener('click', (event) => {
            if (event.target === chatbotOverlay) {
                chatbotOverlay.classList.add('hidden');
            }
        });
    }
});