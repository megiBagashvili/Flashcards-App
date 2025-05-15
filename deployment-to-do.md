# Deployment To-Do List: Live Endpoint & Display Page
**Overall Goal:** Deploy a backend endpoint that accepts text data and a frontend webpage that displays the most recently submitted text, hosted on AWS EC2, to fulfill the assignment requirements.

## Phase D1: Backend Modification for Deployment Assignment
**Goal:** Adapt the existing Flashcards-app/backend to include a new endpoint /api/create-answer that stores (in-memory for simplicity for this assignment) and allows retrieval of the most recent text submission.

- [ ] **D1-C1: New Endpoint Implementation**
  *Goal: Define and implement the new backend routes and data handling logic.*
  - [x] D1-C1-S1: Define New Routes in backend/src/routes/apiRoutes.ts
    *Details:* Add route definitions for POST /api/create-answer and GET /api/get-latest-answer.
  - [x] D1-C1-S2: Implement In-Memory Storage for "Latest Answer"
    *Details:* In a suitable backend file (e.g., create a new backend/src/assignmentStore.ts or add to server.ts if very simple), declare a variable to hold the most recent string received by /api/create-answer.
    ```typescript
    // Example for assignmentStore.ts
    let latestAnswer: string | null = null;
    export const setLatestAnswer = (data: string) => { latestAnswer = data; };
    export const getLatestAnswer = (): string | null => latestAnswer;
    ```
  - [x] D1-C1-S3: Implement POST /api/create-answer Logic
    *Details:* In apiRoutes.ts:
    The handler should expect a JSON body: { "data": "some-text-here" }.
    Validate the request body.
    Store the received data string using the mechanism from D1-C1-S2 (e.g., setLatestAnswer(req.body.data)).
    Respond with a success message (e.g., 201 Created or 200 OK).
  - [x] D1-C1-S4: Implement GET /api/get-latest-answer Logic
    *Details:* In apiRoutes.ts:
    The handler should retrieve the stored string using the mechanism from D1-C1-S2 (e.g., getLatestAnswer()).
    Respond with 200 OK and a JSON body like { "latestData": "the-stored-text-here" } or { "latestData": null } if nothing has been posted yet.
  - [ ] D1-C1-S5: Update Backend Types (Optional)
    *Details:* If desired, add new interfaces in backend/src/types/index.ts for the request/response bodies of these new endpoints.

- [ ] **D1-C2: Local Backend Testing**
  *Goal: Ensure the new backend endpoints function correctly locally.*
  - [ ] D1-C2-S1: Write Basic Tests for New Endpoints (Optional but Recommended)
    *Details:* Add new test cases in backend/src/routes/api.test.ts for /api/create-answer and /api/get-latest-answer.
  - [ ] D1-C2-S2: Test POST /api/create-answer Locally
    *Details:* Run the backend (npm run dev). Use Postman or curl to send a POST request with the specified JSON body to http://localhost:3001/api/create-answer. Verify the success response.
  - [ ] D1-C2-S3: Test GET /api/get-latest-answer Locally
    *Details:* After posting data, use Postman, curl, or a browser to send a GET request to http://localhost:3001/api/get-latest-answer. Verify it returns the data you posted.

- [ ] **D1-C3: Git Commit Backend Changes**
  *Goal: Save the backend modifications to version control.*
  - [ ] D1-C3-S1: Commit New Endpoint and Storage Logic
    *Details:* Stage and commit the changes to apiRoutes.ts, the new storage mechanism file (if any), and test files. Use a descriptive commit message (e.g., feat(backend): add /create-answer and /get-latest-answer for deployment assignment).

## Phase D2: Frontend Page Creation for Deployment Assignment
**Goal:** Create a new, simple, standalone HTML page within the Flashcards-app/frontend directory that fetches and displays the most recent answer from the backend.

- [ ] **D2-C1: Create Basic Frontend Files**
  *Goal: Set up the HTML, JavaScript, and optional CSS files for the display page.*
  - [ ] D2-C1-S1: Create frontend/answer-display/index.html
    *Details:* Create a new directory answer-display inside Flashcards-app/frontend. Add a basic index.html file.
  - [ ] D2-C1-S2: Create frontend/answer-display/script.js
    *Details:* Create a corresponding JavaScript file.
  - [ ] D2-C1-S3: Create frontend/answer-display/style.css (Optional)
    *Details:* Create if you want to add any custom styling.

- [ ] **D2-C2: Implement Frontend Logic**
  *Goal: Add HTML structure and JavaScript to fetch and display data.*
  - [ ] D2-C2-S1: Structure index.html
    *Details:* Include a <span> element with id="answer" as required by the assignment. Link script.js and style.css (if created).
    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Latest Answer Display</title>
        </head>
    <body>
        <h1>Most Recent Data Submitted:</h1>
        <p><span id="answer">Loading...</span></p>
        <script src="script.js"></script>
    </body>
    </html>
    ```
  - [ ] D2-C2-S2: Implement script.js to Fetch and Display Data
    *Details:*
    On page load, use fetch to make a GET request to the (local for now) backend endpoint /api/get-latest-answer.
    On successful response, parse the JSON and update the textContent of the <span id="answer"> element.
    Handle potential fetch errors or cases where no data is available.
    ```javascript
    // Example for script.js
    document.addEventListener('DOMContentLoaded', () => {
        const answerSpan = document.getElementById('answer');
        const apiUrl = 'http://localhost:3001/api/get-latest-answer'; // Will be updated for EC2

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(HTTP error! status: ${response.status});
                }
                return response.json();
            })
            .then(data => {
                if (answerSpan) {
                    answerSpan.textContent = data.latestData !== null ? data.latestData : 'No data submitted yet.';
                }
            })
            .catch(error => {
                console.error('Error fetching latest answer:', error);
                if (answerSpan) {
                    answerSpan.textContent = 'Error loading data.';
                }
            });
    });
    ```
  - [ ] D2-C2-S3: Style the Page (Optional)
    *Details:* Add any desired CSS to style.css.

- [ ] **D2-C3: Local Frontend Testing**
  *Goal: Ensure the frontend page correctly interacts with the local backend.*
  - [ ] D2-C3-S1: Serve index.html Locally
    *Details:* Open frontend/answer-display/index.html directly in your browser, or use a simple HTTP server (e.g., VS Code Live Server extension, or run npx serve ./frontend/answer-display from the project root).
  - [ ] D2-C3-S2: Test Interaction with Local Backend
    *Details:*
    Ensure your local backend is running.
    Use Postman/curl to POST some data to http://localhost:3001/api/create-answer.
    Refresh the index.html page in your browser and verify the submitted data appears.
    Post different data and refresh again to see it update.

- [ ] **D2-C4: Git Commit Frontend Page**
  *Goal: Save the new frontend page to version control.*
  - [ ] D2-C4-S1: Commit New Frontend Page Files
    *Details:* Stage and commit the new frontend/answer-display directory. Use a descriptive commit message (e.g., feat(frontend): add answer display page for deployment assignment).

## Phase D3: AWS EC2 Setup & Application Deployment
**Goal:** Deploy the modified backend and the new frontend page to a live AWS EC2 instance, following the provided AWS guide.

- [ ] **D3-C1: AWS Account & EC2 Instance Launch**
  *Goal: Set up the AWS environment and launch a virtual server.*
  - [ ] D3-C1-S1: Create/Login to AWS Account (as per provided guide)
  - [ ] D3-C1-S2: Launch EC2 Instance (as per provided guide)
    *Details:* Name your instance. Choose AMI: "Amazon Linux 2023". Instance Type: "t2.micro".
  - [ ] D3-C1-S3: Create and Download New Key Pair (.pem) (as per provided guide)
    *Details:* Name it, RSA, .pem format. Store this file securely.
  - [ ] D3-C1-S4: Configure Network Settings During Launch (as per provided guide)
    *Details:* Allow SSH (from Anywhere initially, can be restricted later). Allow HTTP and HTTPS traffic from the internet.
  - [ ] D3-C1-S5: Configure Storage (as per provided guide)
    *Details:* Default 8GB is likely sufficient.
  - [ ] D3-C1-S6: Launch Instance

- [ ] **D3-C2: Connect to EC2 & Initial Server Setup**
  *Goal: Access the EC2 instance and install necessary software.*
  - [ ] D3-C2-S1: Connect to EC2 Instance (as per provided guide)
    *Details:* Use EC2 Instance Connect or SSH with your .pem key (ssh -i /path/to/your-key.pem ec2-user@<YOUR_EC2_PUBLIC_IP>).
  - [ ] D3-C2-S2: Update System Packages
    *Details:* sudo dnf update -y
  - [ ] D3-C2-S3: Install Node.js & npm
    *Details:* sudo dnf install -y nodejs. Verify with node -v and npm -v.
  - [ ] D3-C2-S4: Install Git
    *Details:* sudo dnf install -y git

- [ ] **D3-C3: Deploy Application Code to EC2**
  *Goal: Transfer your project code to the EC2 instance and install dependencies.*
  - [ ] D3-C3-S1: Clone Project Repository from Git to EC2
    *Details:* git clone https://github.com/yourusername/your-flashcards-app.git (replace with your actual repo URL).
  - [ ] D3-C3-S2: Navigate to Project Directory
    *Details:* cd your-flashcards-app
  - [ ] D3-C3-S3: Install Backend Dependencies
    *Details:* cd backend && npm install
  - [ ] D3-C3-S4: Build Backend Code
    *Details:* Still in the backend directory, run npm run build.
  - [ ] D3-C3-S5: (No Frontend Build for Static Page)
    *Details:* The simple HTML/JS frontend page does not require a build step.

- [ ] **D3-C4: Configure Backend for EC2 Environment**
  *Goal: Set up environment variables and ensure the backend listens correctly.*
  - [ ] D3-C4-S1: Create .env File in backend Directory on EC2
    *Details:* cd your-flashcards-app/backend. Create a .env file (e.g., nano .env).
    Add PORT=3001 (or your chosen backend port).
    Note: If you decided to use the database for the assignment's create-answer endpoint, add your PostgreSQL connection variables here (e.g., PGHOST=localhost, PGUSER, PGPASSWORD, PGDATABASE if you set up Postgres on EC2, or remote DB details). For the assignment's in-memory approach, only PORT is strictly needed.
  - [ ] D3-C4-S2: Verify Backend Listens on 0.0.0.0
    *Details:* Your server.ts with if (require.main === module) and app.listen(PORT, ...) without a specific host should default to listening on all available network interfaces (0.0.0.0), which is correct for EC2.

- [ ] **D3-C5: Configure Frontend for EC2 Environment**
  *Goal: Update the frontend page to point to the live backend API.*
  - [ ] D3-C5-S1: Update API Base URL in frontend/answer-display/script.js on EC2
    *Details:* cd your-flashcards-app/frontend/answer-display. Edit script.js (e.g., nano script.js).
    Change const apiUrl = 'http://localhost:3001/api/get-latest-answer';
    To: const apiUrl = 'http://<YOUR_EC2_PUBLIC_IP_ADDRESS>:3001/api/get-latest-answer'; (Replace <YOUR_EC2_PUBLIC_IP_ADDRESS> with the actual public IP of your EC2 instance).

- [ ] **D3-C6: Configure EC2 Security Group**
  *Goal: Open necessary ports in the EC2 firewall.*
  - [ ] D3-C6-S1: Access Security Group for your EC2 Instance (via AWS Management Console)
  - [ ] D3-C6-S2: Edit Inbound Rules
  - [ ] D3-C6-S3: Add Rule for Backend Port
    *Details:* Type: Custom TCP, Port Range: 3001 (or your backend port), Source: Anywhere - IPv4 (0.0.0.0/0). Add a description like "Backend API for Flashcards".
  - [ ] D3-C6-S4: Add Rule for Frontend HTTP Access
    *Details:* Type: HTTP, Port Range: 80, Source: Anywhere - IPv4 (0.0.0.0/0). Add a description like "Frontend Webpage for Flashcards".
  - [ ] D3-C6-S5: Save Rules

- [ ] **D3-C7: Run Applications on EC2 using PM2**
  *Goal: Start and manage the backend and frontend services to keep them running.*
  - [ ] D3-C7-S1: Install PM2 Globally on EC2
    *Details:* sudo npm install -g pm2
  - [ ] D3-C7-S2: Start Backend Application with PM2
    *Details:* Navigate to your backend directory: cd your-flashcards-app/backend.
    Start the server: pm2 start dist/server.js --name "flashcard-backend" (This assumes your build output is dist/server.js).
  - [ ] D3-C7-S3: Serve Frontend Page with PM2 using a Simple HTTP Server
    *Details:*
    Install serve globally: sudo npm install -g serve
    Navigate to your frontend display page directory: cd your-flashcards-app/frontend/answer-display
    Start serving on port 80: pm2 start serve --name "flashcard-frontend" -- -s . -l 80
    (The -s . tells serve to serve the current directory, -l 80 listens on port 80).
  - [ ] D3-C7-S4: Verify PM2 Process Status
    *Details:* pm2 list. Ensure both flashcard-backend and flashcard-frontend are online.
  - [ ] D3-C7-S5: Check Application Logs via PM2
    *Details:* pm2 logs flashcard-backend and pm2 logs flashcard-frontend to see console output and troubleshoot if needed.
  - [ ] D3-C7-S6: Configure PM2 to Start on System Reboot (as per provided guide)
    *Details:* pm2 startup (follow instructions, it will output a command to run, likely with sudo). Then pm2 save.

## Phase D4: Final Testing & Submission
**Goal:** Thoroughly test the deployed application and submit the required URLs.

- [ ] **D4-C1: Test Deployed Backend Endpoint**
  *Goal: Verify the live backend endpoint is working as expected.*
  - [ ] D4-C1-S1: Obtain EC2 Instance Public IP Address
    *Details:* From the EC2 Dashboard in the AWS Console.
  - [ ] D4-C1-S2: Send POST Request to Live Backend Endpoint
    *Details:* Use Postman or curl to send a POST request to http://<YOUR_EC2_PUBLIC_IP_ADDRESS>:3001/api/create-answer with a JSON body like { "data": "live-test-data-1" }.
    Verify you receive a 200 OK or 201 Created response.
  - [ ] D4-C1-S3: Check PM2 Logs for Backend
    *Details:* pm2 logs flashcard-backend on the EC2 instance to see if the request was received and processed without errors.

- [ ] **D4-C2: Test Deployed Frontend Page**
  *Goal: Verify the live frontend page correctly displays data from the backend.*
  - [ ] D4-C2-S1: Access Frontend URL in a Browser
    *Details:* Open http://<YOUR_EC2_PUBLIC_IP_ADDRESS>/ (it should serve index.html from frontend/answer-display because PM2/serve is listening on port 80).
  - [ ] D4-C2-S2: Verify Data Display
    *Details:* The page should display "live-test-data-1" (or whatever you sent in D4-C1-S2) inside the <span id="answer">.
  - [ ] D4-C2-S3: Test Update Flow
    *Details:* Send another POST request to the backend endpoint with different data (e.g., { "data": "live-test-data-2" }).
  - [ ] D4-C2-S4: Refresh Frontend Page
    *Details:* Refresh http://<YOUR_EC2_PUBLIC_IP_ADDRESS>/ in your browser. Verify the displayed text updates to "live-test-data-2".
  - [ ] D4-C2-S5: Check Browser Console and Frontend PM2 Logs
    *Details:* Check the browser's developer console for any JavaScript errors on the frontend page. Check pm2 logs flashcard-frontend on EC2 for any errors from the serve process.

- [ ] **D4-C3: Prepare and Submit URLs**
  *Goal: Finalize the URLs and submit them for the assignment.*
  - [ ] D4-C3-S1: Confirm Final Backend URL Endpoint
    *Details:* http://<YOUR_EC2_PUBLIC_IP_ADDRESS>:3001/api/create-answer
  - [ ] D4-C3-S2: Confirm Final Frontend URL
    *Details:* http://<YOUR_EC2_PUBLIC_IP_ADDRESS>/
  - [ ] D4-C3-S3: Submit URLs to the Assignment Link
    *Details:* Use the link provided by your professor: https://www.kiu.academy/assignments/7c1236d1-aa50-485e-8fa8-85dc87a5b4c7
  - [ ] D4-C3-S4: Celebrate!
    *Details:* Deployment assignment complete!
