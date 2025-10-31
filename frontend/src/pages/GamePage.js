import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Board from '../components/Board';
import ELOChangeModal from '../components/ELOChangeModal';
import { gameService } from '../services/gameService';
import roomService from '../services/roomService';
import { useAuth } from '../utils/auth';
import './GamePage.css';

const BOARD_SIZE = 15;

function GamePage() {
  const { mode: paramMode } = useParams(); // local, online, ai from URL params
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const matchId = searchParams.get('matchId');
  const queryMode = searchParams.get('mode'); // mode from query string
  const roomCode = searchParams.get('roomCode'); // room code if started from room
  const mode = queryMode || paramMode; // Prefer query mode for matchmaking
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
  
  // ELO Modal state
  const [showELOModal, setShowELOModal] = useState(false);
  const [eloData, setEloData] = useState(null);
  const [matchResult, setMatchResult] = useState(null); // 'win', 'loss', 'draw'

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
      
      // Auto-detect hostname
      const hostname = window.location.hostname;
      const apiUrl = hostname === 'localhost' || hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : `http://${hostname}:8000`;
      
      const response = await fetch(`${apiUrl}/api/games/${matchId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load match');
      
      const data = await response.json();
      setMatchData(data);
      
      // Determine which player I am
      let myPlayerValue = null;
      if (data.black_player_detail && data.black_player_detail.id === user.id) {
        myPlayerValue = 'X';
      } else if (data.white_player_detail && data.white_player_detail.id === user.id) {
        myPlayerValue = 'O';
      }
      setMyPlayer(myPlayerValue);
      
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
      
      // Set initial status based on turn
      if (myPlayerValue === data.current_turn) {
        setGameStatus('🎯 Your turn!');
      } else {
        setGameStatus('⏳ Waiting for opponent...');
      }
      
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
    
    // Automatically detect the correct WebSocket URL based on current hostname
    const hostname = window.location.hostname;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${hostname}:8000/ws/game/${matchId}/?token=${token}`;
    
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
          
          // Determine result text
          let resultText = '';
          if (data.result.result === 'black_win') {
            setWinner('X');
            resultText = 'Black wins! 🎉';
          } else if (data.result.result === 'white_win') {
            setWinner('O');
            resultText = 'White wins! 🎉';
          } else {
            resultText = 'Draw! 🤝';
          }
          setGameStatus(resultText);
          
          // Show ELO modal for online matches with ELO changes
          if (mode === 'online' && data.result.elo_changes && user) {
            console.log('🎮 Game Over - Debug Info:');
            console.log('  My Player:', myPlayer);
            console.log('  Result:', data.result.result);
            console.log('  ELO Changes:', data.result.elo_changes);
            console.log('  User ID:', user.id);
            
            // Determine which player I am based on user_id (more reliable than myPlayer state)
            const amIBlackPlayer = data.result.elo_changes.black_player.user_id === user.id;
            const myPlayerData = amIBlackPlayer
              ? data.result.elo_changes.black_player 
              : data.result.elo_changes.white_player;
            
            console.log('  Am I Black Player?', amIBlackPlayer);
            console.log('  My Player Data:', myPlayerData);
            
            if (myPlayerData) {
              // Determine match result from my perspective
              let myResult = 'draw';
              if (data.result.result === 'black_win') {
                myResult = amIBlackPlayer ? 'win' : 'loss';
              } else if (data.result.result === 'white_win') {
                myResult = amIBlackPlayer ? 'loss' : 'win';
              }
              
              console.log('  My Result:', myResult);
              
              setMatchResult(myResult);
              setEloData({
                oldElo: myPlayerData.old_elo,
                newElo: myPlayerData.new_elo,
                change: myPlayerData.change,
                oldRank: myPlayerData.old_rank,
                newRank: myPlayerData.new_rank
              });
              
              // Show modal after a short delay for better UX
              setTimeout(() => {
                setShowELOModal(true);
              }, 1500);
            }
          }
        } else {
          // Update status based on whose turn it is
          if (myPlayer === nextPlayer) {
            setGameStatus('🎯 Your turn!');
          } else {
            setGameStatus('⏳ Waiting for opponent...');
          }
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
        setGameStatus('❌ Not your turn!');
        setTimeout(() => {
          setGameStatus('⏳ Waiting for opponent...');
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
        setGameStatus('⏳ Waiting for opponent...');
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

  // Handle back to dashboard - leave room if from room
  const handleBackToDashboard = async () => {
    if (roomCode) {
      try {
        // Leave room before navigating
        await roomService.leaveRoom(roomCode);
      } catch (err) {
        console.error('Error leaving room:', err);
        // Navigate anyway even if leave fails
      }
    }
    navigate('/dashboard');
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

        {/* ELO Change Modal - Shows first for online matches */}
        {mode === 'online' && (
          <ELOChangeModal
            isOpen={showELOModal}
            onClose={() => setShowELOModal(false)}
            matchResult={matchResult}
            eloData={eloData}
          />
        )}

        {/* Game Over Modal for Online Mode - Shows after ELO modal is closed */}
        {gameOver && mode === 'online' && !showELOModal && (
          <div className="game-over-modal">
            <div className="modal-content">
              {winner === myPlayer ? (
                <>
                  <div className="modal-icon winner">🎉</div>
                  <h2 className="modal-title winner">Victory!</h2>
                  <p className="modal-message">Congratulations! You won the match!</p>
                </>
              ) : winner && winner !== myPlayer ? (
                <>
                  <div className="modal-icon loser">😔</div>
                  <h2 className="modal-title loser">Defeat</h2>
                  <p className="modal-message">Better luck next time!</p>
                </>
              ) : (
                <>
                  <div className="modal-icon draw">🤝</div>
                  <h2 className="modal-title draw">Draw!</h2>
                  <p className="modal-message">It's a tie! Well played!</p>
                </>
              )}
              
              <div className="modal-stats">
                <div className="stat-row">
                  <span>⚫ Black:</span>
                  <span className="player-name-stat">{blackPlayer?.username}</span>
                </div>
                <div className="stat-row">
                  <span>⚪ White:</span>
                  <span className="player-name-stat">{whitePlayer?.username}</span>
                </div>
              </div>

              <button 
                onClick={handleBackToDashboard} 
                className="btn btn-primary btn-large"
              >
                🏠 Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GamePage;
