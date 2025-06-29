const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { join } = require("path");

// Route Handler
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log("user connected: ", socket.id);

  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  // If Caller sends ICE, Receiver will receive it (beacause 'broadcast')
  // If Receiver sends ICE, Caller will receive it (beacause 'broadcast')
  socket.on("ice", (candidate) => {
    socket.broadcast.emit("ice", candidate);
  });
});

server.listen(3001, () => {
  console.log("listening on port 3001...");
});
