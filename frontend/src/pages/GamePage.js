import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Board from '../components/Board';
import { gameService } from '../services/gameService';
import { useAuth } from '../utils/auth';
import './GamePage.css';

const BOARD_SIZE = 15;

function GamePage() {
  const { mode } = useParams(); // local, online, ai
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('matchId');
  const { user } = useAuth();
  
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [gameStatus, setGameStatus] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null); // 'X' or 'O'
  const [blackPlayer, setBlackPlayer] = useState(null);
  const [whitePlayer, setWhitePlayer] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const wsRef = useRef(null);

  // Load match data and setup WebSocket for online mode
  useEffect(() => {
    if (mode === 'online' && matchId && !isInitialized && user) {
      console.log('Initializing online game...', matchId, 'User:', user.username);
      // Only load once when component mounts AND user is loaded
      const initGame = async () => {
        await loadMatchData();
        setupWebSocket();
        setIsInitialized(true);
      };
      initGame();
    } else if (mode === 'online' && !matchId) {
      setGameStatus('Finding opponent...');
      setIsWaiting(true);
    } else if (mode === 'ai') {
      setGameStatus('Playing against AI');
    } else {
      setGameStatus('Local multiplayer mode');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, matchId, isInitialized, user]);

  // Separate cleanup effect
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up WebSocket...');
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty deps - only run on unmount

  const loadMatchData = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/games/${matchId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load match');
      
      const data = await response.json();
      setMatchData(data);
      
      // Determine which player I am
      if (data.black_player_detail && data.black_player_detail.id === user.id) {
        setMyPlayer('X');
        setGameStatus(`You are Black (X) - ${data.current_turn === 'X' ? 'Your turn!' : 'Waiting for opponent...'}`);
      } else if (data.white_player_detail && data.white_player_detail.id === user.id) {
        setMyPlayer('O');
        setGameStatus(`You are White (O) - ${data.current_turn === 'O' ? 'Your turn!' : 'Waiting for opponent...'}`);
      }
      
      setBlackPlayer(data.black_player_detail);
      setWhitePlayer(data.white_player_detail);
      
      // Load board state
      if (data.board_state && data.board_state.length > 0) {
        setBoard(data.board_state);
      } else {
        // Initialize empty board if not exists
        const emptyBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        setBoard(emptyBoard);
      }
      
      setCurrentPlayer(data.current_turn);
      
      // Check if game is over
      if (data.status === 'completed') {
        setGameOver(true);
        setWinningLine(data.winning_line);
        if (data.result === 'black_win') {
          setWinner('X');
          setGameStatus('Black wins! 🎉');
        } else if (data.result === 'white_win') {
          setWinner('O');
          setGameStatus('White wins! 🎉');
        } else {
          setGameStatus('Draw! 🤝');
        }
      }
      
    } catch (err) {
      console.error('Error loading match:', err);
      setGameStatus('Failed to load match');
    }
  };

  const setupWebSocket = () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const wsUrl = `ws://localhost:8000/ws/game/${matchId}/?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'game_state') {
        // Initial game state received
        if (data.data) {
          setBoard(data.data.board || Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
          setCurrentPlayer(data.data.current_turn || 'X');
        }
      } else if (data.type === 'move') {
        // Opponent made a move - use functional update to get latest board state
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(row => [...row]);
          newBoard[data.row][data.col] = data.player;
          return newBoard;
        });
        
        // Switch turn
        const nextPlayer = data.player === 'X' ? 'O' : 'X';
        setCurrentPlayer(nextPlayer);
        
        // Update status
        if (data.result && data.result.status === 'game_over') {
          setGameOver(true);
          if (data.result.winning_line) {
            setWinningLine(data.result.winning_line);
          }
          
          if (data.result.result === 'black_win') {
            setWinner('X');
            setGameStatus('Black wins! 🎉');
          } else if (data.result.result === 'white_win') {
            setWinner('O');
            setGameStatus('White wins! 🎉');
          } else {
            setGameStatus('Draw! 🤝');
          }
        } else {
          setGameStatus(myPlayer === nextPlayer ? 'Your turn!' : 'Waiting for opponent...');
        }
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setGameStatus('Connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  };

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
    // For online mode, check if it's my turn
    if (mode === 'online') {
      if (gameOver || !matchId) return;
      
      // Check if it's my turn
      if (myPlayer !== currentPlayer) {
        setGameStatus('Not your turn!');
        setTimeout(() => {
          setGameStatus(myPlayer === currentPlayer ? 'Your turn!' : 'Waiting for opponent...');
        }, 1000);
        return;
      }
      
      // Check if cell is empty
      if (board[row][col]) return;
      
      // Send move via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'make_move',
          row: row,
          col: col,
          player: myPlayer
        }));
        
        // Optimistically update UI using functional update
        setBoard(prevBoard => {
          const newBoard = prevBoard.map(r => [...r]);
          newBoard[row][col] = myPlayer;
          return newBoard;
        });
        setGameStatus('Waiting for opponent...');
      }
      
      return;
    }
    
    // Local and AI mode logic (unchanged)
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
          
          {/* Show player info for online mode */}
          {mode === 'online' && matchData && (
            <div className="players-info">
              <div className={`player-display ${currentPlayer === 'X' ? 'active' : ''}`}>
                <span className="player-symbol">⚫ Black (X)</span>
                <span className="player-name">{blackPlayer?.username || 'Loading...'}</span>
                {myPlayer === 'X' && <span className="you-badge">(You)</span>}
              </div>
              <div className={`player-display ${currentPlayer === 'O' ? 'active' : ''}`}>
                <span className="player-symbol">⚪ White (O)</span>
                <span className="player-name">{whitePlayer?.username || 'Loading...'}</span>
                {myPlayer === 'O' && <span className="you-badge">(You)</span>}
              </div>
            </div>
          )}
          
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

        {gameOver && mode !== 'online' && (
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
