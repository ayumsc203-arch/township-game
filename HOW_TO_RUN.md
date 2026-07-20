# 🚀 How to Run the Township 2D Game

Follow these simple steps to install the required libraries, boot up the local server, and start playing!

---

## 📋 Prerequisites
Make sure you have **Node.js** installed on your computer. 
*   If you don't have it, download and install the recommended version from [nodejs.org](https://nodejs.org/).

---

## 🏃 Step-by-Step Setup Guide

### Step 1: Open Terminal / Command Prompt
*   **Windows:** Open **PowerShell** or **Command Prompt (cmd)**.
*   **Mac/Linux:** Open **Terminal**.

### Step 2: Navigate to the Project Folder
Enter the following command to move into your project folder:
```bash
cd "c:\Users\ayums\OneDrive\Desktop\dev\New folder"
```

### Step 3: Install Required Dependencies
Before running the game for the first time, you must download the server libraries (Express & SQLite3). Run:
```bash
npm install
```
*(This automatically reads `package.json` and installs the correct libraries on your PC inside a local `node_modules` folder).*

### Step 4: Start the Game Server
Launch the Node.js backend server by running:
```bash
npm start
```
You should see a message in the terminal saying:
`Connected to SQLite database at ...`
`Server is running on http://localhost:3000`

### Step 5: Open the Game in Your Browser
Open any web browser (Chrome, Edge, Firefox, Safari) and go to:
**[http://localhost:3000](http://localhost:3000)**

🎉 **You are ready to play!**

---

## 🔌 Stopping & Resuming

*   **To Stop the Server:** Press `Ctrl + C` in your terminal window to shut down the server.
*   **To Resume Play Later:** You do **NOT** need to run `npm install` again. Just navigate to the folder in your terminal and type `npm start`, then open `http://localhost:3000` in your browser!
