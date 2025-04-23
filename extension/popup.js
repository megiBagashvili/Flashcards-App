function fetchSelectedText() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("No active tab found.");
        return;
      }
      const activeTab = tabs[0];
  
      if (!activeTab.id) {
          console.error("Active tab has no ID.");
          const frontTextArea = document.getElementById('card-front');
          if (frontTextArea) {
              frontTextArea.placeholder = "Cannot get text from this page.";
          }
          return;
      }
  
  
      console.log(`Sending message to tab ${activeTab.id}`); 
  
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "GET_SELECTED_TEXT" },
        (response) => {
  
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
             const frontTextArea = document.getElementById('card-front');
             if (frontTextArea) {
                 frontTextArea.placeholder = `Error: ${chrome.runtime.lastError.message}. Try reloading the page?`;
             }
            return;
          }
  
          if (response && response.selectedText !== undefined) {
            console.log("Received response:", response); 
            const frontTextArea = document.getElementById("card-front");
            if (frontTextArea) {
              frontTextArea.value = response.selectedText;
              console.log("Updated textarea with:", response.selectedText); 
            } else {
              console.error("Textarea element 'card-front' not found.");
            }
          } else {
            console.warn("Received no response or invalid response format from content script.");
             const frontTextArea = document.getElementById('card-front');
             if (frontTextArea) {
                  if (!frontTextArea.value) { 
                     frontTextArea.placeholder = "No text selected on page.";
                  }
             }
          }
        }
      );
    });
  }
  
  document.addEventListener('DOMContentLoaded', fetchSelectedText);
  
  console.log("Popup script loaded.");