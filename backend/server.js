const http = require('http');
const express = require('express');

const { Server: SocketServer } = require('socket.io'); 
const app = express();


const server = http.createServer(app); 

require('dotenv').config();
const cors = require('cors');
const connectDb = require('./config/db');
const askAI = require('./config/aiClient');
const resumeRoutes = require("./routes/resumeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const hrRoutes = require("./routes/hrRoutes");

// 3. Initialize Socket.io using the lowercase 'server' variable
const io = new SocketServer(server, {
  cors: {
    origin: "*"
  }
});

require("./socket/interviewSocket")(io);

// Middleware
app.use(express.json());
app.use(cors());

app.use("/api/resume", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/hr", hrRoutes);

// Connect Database 
connectDb();

app.get('/', (req, res) => {
    res.send("Smart Recruit AI Backend is Running");
});

app.get('/task-ai', async (req, res) => {
    const result = await askAI("say hello from AI");
    res.json({ result });
});

const PORT = 3000;

// 4. Use 'server.listen', not 'Server.listen'
server.listen(PORT, () => {
    console.log(`server is listening on the port http://localhost:${PORT}`);
});