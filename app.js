const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingPlayer = null;
const games = {};

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { title: 'Chess Game' });
});

io.on('connection', (socket) => {
    console.log("New user connected:", socket.id);

    if (waitingPlayer) {
        const roomId = `${waitingPlayer.id}-${socket.id}`;
        const chess = new Chess();
        games[roomId] = {
            white: waitingPlayer.id,
            black: socket.id,
            chess
        };

        waitingPlayer.join(roomId);
        socket.join(roomId);

        io.to(waitingPlayer.id).emit('playerRole', 'w');
        io.to(socket.id).emit('playerRole', 'b');


        setTimeout(() => {
            io.to(roomId).emit('startGame');
        }, 2000);

        waitingPlayer = null;
    } else {
        waitingPlayer = socket;
        socket.emit('waitingForOpponent');
    }

    socket.on('move', (move) => {
        try{
            
        
        const roomId = getRoomId(socket.id);
        const game = games[roomId];
        if (!game) return;

        const chess = game.chess;
        const playerColor = socket.id === game.white ? 'w' : 'b';
        if (chess.turn() !== playerColor) return;

        const result = chess.move(move);
        if (result) {
            io.to(roomId).emit('move', move);
            io.to(roomId).emit('boardState', chess.fen());

            if (chess.isCheckmate()) {
                io.to(roomId).emit('gameOver', `Checkmate! ${playerColor === 'w' ? 'White' : 'Black'} wins! Refresh the page to start a new game.`);
            } else if (chess.isStalemate()) {
                io.to(roomId).emit('gameOver', 'Stalemate! It\'s a draw.');
            } else if (chess.isDraw()) {
                io.to(roomId).emit('gameOver', 'Draw!');
            }
            
        } else {
            socket.emit('invalidMove');
        }
    }
    catch(err){
        console.log(err);
        socket.emit("invalidMove: ", move);
    }

        
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }

        const roomId = getRoomId(socket.id);
        if (games[roomId]) {
            io.to(roomId).emit('gameOver', 'Opponent disconnected Refresh the page to start a new game.');
            delete games[roomId];
        }
    });

    function getRoomId(id) {
        return Object.keys(games).find(roomId =>
            games[roomId].white === id || games[roomId].black === id
        );
    }
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

