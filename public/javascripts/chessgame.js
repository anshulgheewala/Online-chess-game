const socket  = io();
const chess = new Chess(); // chessboard.js library is used to create the chessboard
const boardElement = document.querySelector(".chessboard");
const boardContainer = document.querySelector(".chessboard");
const mycolor=document.getElementById("myColor");
const turn= document.getElementById("turn");
const statusElement = document.getElementById("status");
const loading = document.getElementById("loading");
loading.innerText = "Connecting to a player...";
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

boardContainer.style.display = "none";  // Hide initially
statusElement.innerText = "Connecting...";

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ""; // it clears the board everytime a board is rendered
    mycolor.innerText =`You are ${playerRole === 'w' ? "White" : playerRole === 'b' ? "Black" : "Spectator"}`;
    turn.innerText = `Turn: ${chess.turn() === 'w' ? "White" : "Black"}`; // it shows the current turn of the game

    
    board.forEach((row, rowIndex) =>{
        row.forEach((square, squareIndex) =>{
    
            
            const squareElement = document.createElement('div');
            squareElement.classList.add('square', (rowIndex + squareIndex) % 2 === 0 ? 'light' : 'dark'); // done for the white and black squares on the chessboard
            squareElement.dataset.row= rowIndex;
            squareElement.dataset.col= squareIndex;

            if(square){
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', square.color === 'w' ? 'white' : 'black');

                pieceElement.innerText= getPieceUnicode(square);;
                pieceElement.draggable= playerRole === square.color; // only the player whose turn it is can drag the piece

                pieceElement.addEventListener('dragstart', (e) => {
                    if(pieceElement.draggable){
                        draggedPiece = pieceElement;
                        sourceSquare = {row: rowIndex, col: squareIndex};
                        
                        e.dataTransfer.setData('text/plain', "");
                    }
              });

                pieceElement.addEventListener('dragend', (e)=> {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault(); // stops to drag the piece inbetween to any other square
            });

            squareElement.addEventListener('drop', (e)=>{
                e.preventDefault();

                if(draggedPiece){
                    const targetSquare ={
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    }

                    handleMove(sourceSquare, targetSquare);
                }
            });
            boardElement.appendChild(squareElement);
        });
    });

    if(playerRole==='b'){
        boardElement.classList.add("flipped");
    }
    else{
        boardElement.classList.remove("flipped");
    }
};



const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q'
    }

    socket.emit("move",move);

}

const getPieceUnicode = (piece) => {

    const unicodePieces = {
        K: "♔",  // King
        Q: "♕",  // Queen
        R: "♖",  // Rook
        B: "♗",  // Bishop
        N: "♘",  // Knight
        P: "♙",  // Pawn
        k: "♚",  // King
        q: "♛",  // Queen
        r: "♜",  // Rook
        b: "♝",  // Bishop
        n: "♞",  // Knight
        p: "♙"   // Pawn
    };

    return unicodePieces[piece.type] || "";

};

// socket.on('playerRole', (role)=> {
//     playerRole = role;
//     // renderBoard();
// });

socket.on('spectatorRole', () => {
    playerRole = null;
    renderBoard();
});

socket.on('boardState', (fen) => {
    chess.load(fen);
    renderBoard();

});

socket.on('move', (move) => {
    chess.move(move);
    renderBoard();

});

// socket.on('waitingForOpponent', () => {
//     boardContainer.style.display = "none";
//     statusElement.innerText = "Waiting for opponent...";
// });

// socket.on('startGame', () => {
//     boardContainer.style.display = "grid";
//     statusElement.innerText = "Connecting to a player...";
//     setTimeout(() => {
//         boardContainer.style.display = "grid";
//         statusElement.innerText = "";
//         renderBoard();
//     }, 2000);
//     //renderBoard();
// });

socket.on('waitingForOpponent', () => {
    loading.innerText = "Waiting for an opponent...";
});

socket.on('playerRole', (role) => {
    playerRole = role;
    loading.innerText = "Connected! Preparing game...";
});

socket.on('startGame', () => {
    loading.style.display = 'none';
    statusElement.innerText = "";
    boardContainer.style.display = "grid";
    renderBoard();
});

socket.on('gameOver',() =>{
    boardContainer.style.display = "none";
    statusElement.innerText = "Opponent Left the game please refresh the page to find new game";
    mycolor.style.display = "none";
    turn.style.display = "none";

});

socket.on('gameOver', (message) => {
    boardContainer.style.display = "none";
    statusElement.innerText = message;
    mycolor.style.display = "none";
    turn.style.display = "none";
});

socket.on('invalidMove', () => {
    alert("Invalid move.");
});
