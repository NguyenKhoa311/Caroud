import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Board from '../components/Board';
import { gameService } from '../services/gameService';
import './GamePage.css';

const BOARD_SIZE = 15;

function GamePage() {
  const { mode } = useParams(); // local, online, ai
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [gameStatus, setGameStatus] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    if (mode === 'online') {
      setGameStatus('Finding opponent...');
      setIsWaiting(true);
      // TODO: Connect to matchmaking service
      setTimeout(() => {
        setIsWaiting(false);
        setGameStatus('Game started!');
      }, 2000);
    } else if (mode === 'ai') {
      setGameStatus('Playing against AI');
    } else {
      setGameStatus('Local multiplayer mode');
    }
  }, [mode]);

  const checkWinner = (board, row, col, player) => {
    const directions = [
      [[0, 1], [0, -1]],   // horizontal
      [[1, 0], [-1, 0]],   // vertical
      [[1, 1], [-1, -1]],  // diagonal \
      [[1, -1], [-1, 1]]   // diagonal /
    ];

    for (const [dir1, dir2] of directions) {
      const line = [[row, col]];
      
      // Check in first direction
      let [r, c] = [row + dir1[0], col + dir1[1]];
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        line.push([r, c]);
        r += dir1[0];
        c += dir1[1];
      }
      
      // Check in opposite direction
      [r, c] = [row + dir2[0], col + dir2[1]];
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        line.push([r, c]);
        r += dir2[0];
        c += dir2[1];
      }
      
      if (line.length >= 5) {
        return line;
      }
    }
    
    return null;
  };

  const handleCellClick = async (row, col) => {
    if (board[row][col] || gameOver || isWaiting) return;

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const winLine = checkWinner(newBoard, row, col, currentPlayer);
    if (winLine) {
      setWinningLine(winLine);
      setWinner(currentPlayer);
      setGameOver(true);
      setGameStatus(`${currentPlayer === 'X' ? 'Black' : 'White'} wins! 🎉`);
      
      // TODO: Save game result to backend
      return;
    }

    // Check for draw
    const isFull = newBoard.every(row => row.every(cell => cell !== null));
    if (isFull) {
      setGameOver(true);
      setGameStatus('Draw! 🤝');
      return;
    }

    // Switch player
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);

    // AI move
    if (mode === 'ai' && nextPlayer === 'O') {
      setIsWaiting(true);
      setTimeout(() => {
        makeAIMove(newBoard);
        setIsWaiting(false);
      }, 500);
    }
  };

  const makeAIMove = (currentBoard) => {
    // Simple AI: Find random empty cell
    // TODO: Implement smarter AI logic
    const emptyCells = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (!currentBoard[i][j]) {
          emptyCells.push([i, j]);
        }
      }
    }

    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newBoard = currentBoard.map(row => [...row]);
      newBoard[row][col] = 'O';
      setBoard(newBoard);

      const winLine = checkWinner(newBoard, row, col, 'O');
      if (winLine) {
        setWinningLine(winLine);
        setWinner('O');
        setGameOver(true);
        setGameStatus('AI wins! 🤖');
        return;
      }

      setCurrentPlayer('X');
    }
  };

  const handleRestart = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setCurrentPlayer('X');
    setGameOver(false);
    setWinner(null);
    setWinningLine(null);
    if (mode === 'local') {
      setGameStatus('Local multiplayer mode');
    } else if (mode === 'ai') {
      setGameStatus('Playing against AI');
    }
  };

  return (
    <div className="game-page">
      <div className="game-container">
        <div className="game-header">
          <h1>🎮 Caro Game</h1>
          <p className="game-mode">
            Mode: {mode === 'local' ? '👥 Local' : mode === 'online' ? '🌐 Online' : '🤖 vs AI'}
          </p>
          <p className={`game-status ${gameOver ? 'game-over' : ''}`}>
            {gameStatus}
          </p>
        </div>

        {isWaiting && !gameOver ? (
          <div className="waiting-container">
            <div className="spinner"></div>
            <p>Waiting...</p>
          </div>
        ) : (
          <Board 
            board={board}
            onCellClick={handleCellClick}
            currentPlayer={currentPlayer}
            gameOver={gameOver}
            winningLine={winningLine}
          />
        )}

        {gameOver && (
          <div className="game-actions">
            <button onClick={handleRestart} className="btn btn-primary">
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePage;
