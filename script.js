

const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input"); //searches inside form only
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const themeToggle =document.querySelector("#theme-toggle-btn")


// ⚠️ Warning: Do not expose API keys in frontend. Use backend proxy in production.
const API_KEY = "AIzaSyBOS2X2wJY8Y7uSkmF1A89GaKQfUKC_850"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let typingInterval,controller;

const chatHistory = [];
let userData = { message: "", file: {} };

// Create message element
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll to the bottom of the chats container
const scrollToBottom = () => {
  setTimeout(() => {
    chatsContainer.scrollTop = chatsContainer.scrollHeight;
  }, 100); // small delay so new msg height is applied
};


// Typing effect for bot text
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const chars = text.split("");
  let index = 0;

  // Set an interval to type each word
   typingInterval = setInterval(() => {
    if (index < chars.length) {
      textElement.textContent += chars[index++];
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.add("bot-responding");
      scrollToBottom();
    }
  }, 40);
};




// API call
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  // push user message + file into history
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: {
                mime_type: userData.file.mime_type,
                data: userData.file.data,
              },
            },
          ]
        : []),
    ],
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: chatHistory,
      }),
      signal: controller.signal
    });

    const data = await response.json();
    console.log("API Response:", data);

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || "API Error");
    }

    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ No response text from API";

    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }],
    });
  } catch (error) {
    console.error("Error:", error);
    textElement.textContent = `⚠️ ${error.message}`;
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding")
  } finally {
    userData.file = {}; // clear file after sending
  }
};

// Handle form submit
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding") ) return;

  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding","chats-active")
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  // build user message html
  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>`
          : `<p class="file-attachment">
              <span class="material-symbols-rounded">description</span>
              ${userData.file.fileName}
             </p>`
        : ""
    }
  `;

  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // bot placeholder
  setTimeout(() => {
    const botMsgHTML = `
      <img src="gemini-chatbot-logo.svg" class="avatar">
      <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// Handle file input
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];

    if (isImage) {
      fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    } else {
      fileUploadWrapper.querySelector(".file-preview").src = "";
      fileUploadWrapper.querySelector(".file-preview").alt = file.name;
    }

    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );

    // store in userData
    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage,
    };
  };
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove(
    "active",
    "img-attached",
    "file-attached"
  );
});


// stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);

  const loadingBot = chatsContainer.querySelector(".bot-message.loading");
  if (loadingBot) loadingBot.classList.remove("loading");

  // remove bot-responding state so file option comes back
  document.body.classList.remove("bot-responding");
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  
   chatHistory.length = 0;
   chatsContainer.innerHTML = "";
     document.body.classList.remove("bot-responding", "chats-active");
});


// Handle suggestions click

document.querySelectorAll(".suggestions-item").forEach(item => {
  item.addEventListener("click", () =>{

    promptInput.value= item.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});


// show / hide controls for mobile on prompt input focus
 document.addEventListener("click", ({ target }) => {
 const wrapper = document.querySelector(".prompt-wrapper"); 
 const shouldHide= target.classList.contains("prompt-input") || (wrapper.classList.contains 
  ("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
   wrapper.classl.ist.toggle("hide-controls", shouldHide); 
   });



//theme change

themeToggle.addEventListener("click", () => {

 const isLightTheme= document.body.classList.toggle("light-theme");
 localStorage.setItem("themeColor", isLightTheme?"light_mode" : "dark_mode");
 themeToggle.textContent = isLightTheme? "dark_mode" : "light_mode";

});


//set initial theme from local storage
 const isLightTheme= localStorage.getItem("themeColor") === 'light_mode';
 document.body.classList.toggle("light-theme", isLightTheme);
 themeToggle.textContent = isLightTheme? "dark_mode" : "light_mode";

// Form submit
promptForm.addEventListener("submit", handleFormSubmit);

// Add file button
promptForm
  .querySelector("#add-file-btn")
  .addEventListener("click", () => fileInput.click());
