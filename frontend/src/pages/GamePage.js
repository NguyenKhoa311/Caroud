import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Board from '../components/Board';
import ELOChangeModal from '../components/ELOChangeModal';
import AIResultModal from '../components/AIResultModal';
import { gameService } from '../services/gameService';
import roomService from '../services/roomService';
import { useAuth } from '../utils/auth';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';
import config from '../config/environment';
import './GamePage.css';

const BOARD_SIZE = 15;

// Helper function to determine which player the current user is
const determineMyPlayer = (matchData, userId) => {
  if (!matchData || !userId) return null;
  
  if (matchData.black_player_detail?.id === userId) {
    return 'X';
  } else if (matchData.white_player_detail?.id === userId) {
    return 'O';
  }
  
  return null; // Spectator or not in match
};

// Helper function to update game status based on current state
const getGameStatus = (myPlayer, currentTurn, gameOver, result) => {
  if (gameOver) {
    if (result === 'black_win') return 'Black wins! 🎉';
    if (result === 'white_win') return 'White wins! 🎉';
    return 'Draw! 🤝';
  }
  
  if (!myPlayer) return '⏳ Loading...';
  
  if (myPlayer === currentTurn) {
    return '🎯 Your turn!';
  } else {
    return '⏳ Waiting for opponent...';
  }
};

function GamePage() {
  const { mode: paramMode } = useParams(); // local, online, ai from URL params
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const matchId = searchParams.get('matchId');
  const queryMode = searchParams.get('mode'); // mode from query string
  const roomCode = searchParams.get('roomCode'); // room code if started from room
  const mode = queryMode || paramMode; // Prefer query mode for matchmaking
  const { user } = useAuth();
  const { enableBlocking, disableBlocking } = useNavigationGuard();
  
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [gameStatus, setGameStatus] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null); // 'X' or 'O'
  const [blackPlayer, setBlackPlayer] = useState(null);
  const [whitePlayer, setWhitePlayer] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState(null); // For AI mode
  
  // ELO Modal state
  const [showELOModal, setShowELOModal] = useState(false);
  const [eloData, setEloData] = useState(null);
  const [matchResult, setMatchResult] = useState(null); // 'win', 'loss', 'draw'
  
  // AI Result Modal state
  const [showAIResultModal, setShowAIResultModal] = useState(false);
  const [aiResult, setAIResult] = useState(null); // 'win', 'loss', 'draw'
  
  // Track if game ended by disconnect
  const [endedByDisconnect, setEndedByDisconnect] = useState(false);
  
  // Track if user is voluntarily leaving (to wait for ELO before navigating)
  const [isLeavingGame, setIsLeavingGame] = useState(false);
  const [showCalculatingELO, setShowCalculatingELO] = useState(false); // Loading screen
  const pendingNavigationRef = useRef(null);

  const wsRef = useRef(null);
  const navigationBlockedRef = useRef(false);

  // Load match data and setup WebSocket for online mode
  useEffect(() => {
    console.log('🎮 GamePage useEffect - mode:', mode, 'matchId:', matchId, 'currentMatchId:', currentMatchId);
    
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
      // Create AI match if not exists
      if (!currentMatchId) {
        createAIMatch();
      }
    } else if (mode === 'local') {
      setGameStatus('Local multiplayer mode');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, matchId, isInitialized, user]);

  const createAIMatch = async () => {
    try {
      console.log('🤖 Creating AI match...');
      const match = await gameService.createGame('ai');
      setCurrentMatchId(match.id);
      console.log('✅ AI match created:', match.id);
    } catch (err) {
      console.error('❌ Error creating AI match:', err);
    }
  };

  // Separate cleanup effect
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up WebSocket...');
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty deps - only run on unmount

  // Add beforeunload warning for online games in progress
  useEffect(() => {
    if (mode === 'online' && !gameOver && matchId) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'You are in an active game. Leaving will count as a loss. Are you sure?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [mode, gameOver, matchId]);

  // Enable/disable navigation blocking for online games
  useEffect(() => {
    if (mode === 'online' && !gameOver && matchId) {
      // Pass cleanup callback to handle voluntary leave
      const cleanup = (navigateTo) => {
        console.log('🔴 User is leaving voluntarily, showing calculating screen...');
        setIsLeavingGame(true);
        pendingNavigationRef.current = navigateTo;
        
        // Show "Calculating ELO..." screen immediately
        setShowCalculatingELO(true);
        
        // Send leave_game message to backend
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'leave_game'
          }));
          
          console.log('🔴 Sent leave_game, waiting for ELO calculation...');
        } else {
          console.log('🔴 WebSocket not open, navigating immediately');
          navigate(navigateTo);
        }
      };
      
      enableBlocking(cleanup);
      console.log('Navigation blocking enabled');
    } else {
      disableBlocking();
      console.log('Navigation blocking disabled');
    }

    // Cleanup on unmount
    return () => {
      disableBlocking();
    };
  }, [mode, gameOver, matchId, enableBlocking, disableBlocking, navigate]);

  const loadMatchData = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      // Use centralized config for API URL
      console.log('✅ [GamePage.js] Loading match from:', config.apiUrl);
      
      const response = await fetch(`${config.apiUrl}/api/games/${matchId}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load match');
      
      const data = await response.json();
      setMatchData(data);
      
      // Determine which player I am using helper function
      const myPlayerValue = determineMyPlayer(data, user.id);
      setMyPlayer(myPlayerValue);
      
      console.log('✅ Loaded match data:', {
        matchId: data.id,
        mode: data.mode,
        myPlayer: myPlayerValue,
        currentTurn: data.current_turn,
        blackPlayer: data.black_player_detail?.username,
        whitePlayer: data.white_player_detail?.username
      });
      
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
      
      // Set initial status using helper function
      const status = getGameStatus(myPlayerValue, data.current_turn, data.status === 'completed', data.result);
      setGameStatus(status);
      
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
    
    // Use centralized config for WebSocket URL
    const wsUrl = `${config.wsUrl}/game/${matchId}/?token=${token}`;
    
    console.log('🔌 [GamePage.js] Connecting WebSocket to:', wsUrl);
    
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
      } else if (data.type === 'player_connected') {
        console.log('Player connected:', data.user_id);
      } else if (data.type === 'player_disconnected') {
        // Opponent disconnected - handle game over
        console.log('🎮 PLAYER DISCONNECTED EVENT:', {
          disconnected_user_id: data.disconnected_user_id,
          result: data.result,
          elo_changes: data.elo_changes,
          my_user_id: user?.id,
          isLeavingGame: isLeavingGame
        });
        
        if (data.result) {
          setGameOver(true);
          setEndedByDisconnect(true); // Mark that game ended by disconnect
          
          // Determine winner
          if (data.result === 'black_win') {
            setWinner('X');
            setGameStatus('Black wins! 🎉 (Opponent disconnected)');
          } else if (data.result === 'white_win') {
            setWinner('O');
            setGameStatus('White wins! 🎉 (Opponent disconnected)');
          }
          
          // Show ELO modal if available
          if (data.elo_changes && user) {
            const amIBlackPlayer = data.elo_changes.black_player.user_id === user.id;
            const myPlayerData = amIBlackPlayer
              ? data.elo_changes.black_player 
              : data.elo_changes.white_player;
            
            // Determine match result from my perspective
            let myResult = 'draw';
            if (data.result === 'black_win') {
              myResult = amIBlackPlayer ? 'win' : 'loss';
            } else if (data.result === 'white_win') {
              myResult = amIBlackPlayer ? 'loss' : 'win';
            }
            
            setMatchResult(myResult);
            setEloData({
              oldElo: myPlayerData.old_elo,
              newElo: myPlayerData.new_elo,
              change: myPlayerData.change,
              oldRank: myPlayerData.old_rank,
              newRank: myPlayerData.new_rank
            });
            
            // Show modal immediately if user is leaving, otherwise delay
            if (isLeavingGame) {
              console.log('🔴 ELO calculated! Hiding calculating screen and showing ELO modal');
              
              // Hide calculating screen
              setShowCalculatingELO(false);
              
              // Show ELO modal with real data
              setShowELOModal(true);
              
              // Close WebSocket after receiving ELO data
              setTimeout(() => {
                if (wsRef.current) {
                  console.log('🔴 Closing WebSocket after receiving ELO');
                  wsRef.current.close();
                }
              }, 500);
            } else {
              setTimeout(() => {
                setShowELOModal(true);
              }, 1500);
            }
          } else if (isLeavingGame) {
            // No ELO data but user is leaving - navigate immediately
            console.log('🔴 No ELO data, navigating immediately');
            const destination = pendingNavigationRef.current || '/dashboard';
            navigate(destination);
          }
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
          // Game continues - update status using helper function
          const status = getGameStatus(myPlayer, nextPlayer, false, null);
          setGameStatus(status);
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
    console.log('🎯 Cell clicked:', { row, col, mode, currentPlayer, gameOver, currentMatchId });
    
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
    
    // Local and AI mode logic
    if (board[row][col] || gameOver || isAIThinking) return;

    // For AI mode, make move via API first
    if (mode === 'ai' && currentMatchId) {
      console.log('🎯 Player making move via API:', { row, col, player: currentPlayer });
      
      try {
        // Send player move to backend
        const moveResponse = await gameService.makeMove(currentMatchId, row, col);
        console.log('✅ Player move response:', moveResponse);
        
        // Update board from backend response
        setBoard(moveResponse.match.board_state);
        setCurrentPlayer(moveResponse.match.current_turn);
        
        // Check if game over after player move
        if (moveResponse.status === 'game_over') {
          setGameOver(true);
          setWinningLine(moveResponse.winning_line);
          
          if (moveResponse.result === 'black_win') {
            setWinner('X');
            setGameStatus('You win! 🎉');
            setAIResult('win');
            setTimeout(() => setShowAIResultModal(true), 1500);
          } else if (moveResponse.result === 'draw') {
            setGameStatus('Draw! 🤝');
            setAIResult('draw');
            setTimeout(() => setShowAIResultModal(true), 1500);
          }
          return;
        }
        
        // Now it's AI's turn - call AI move
        console.log('🤖 AI turn, calling getAIMove');
        const aiResponse = await gameService.getAIMove(currentMatchId);
        console.log('✅ AI move response:', aiResponse);
        
        // Update board with AI move
        setBoard(aiResponse.match.board_state);
        setCurrentPlayer(aiResponse.match.current_turn);
        
        // Check if AI won or draw
        if (aiResponse.status === 'game_over') {
          setGameOver(true);
          
          if (aiResponse.result === 'white_win') {
            setWinner('O');
            setWinningLine(aiResponse.winning_line);
            setGameStatus('AI wins! 🤖');
            setAIResult('loss');
            setTimeout(() => setShowAIResultModal(true), 1500);
          } else if (aiResponse.result === 'draw') {
            setGameStatus('Draw! 🤝');
            setAIResult('draw');
            setTimeout(() => setShowAIResultModal(true), 1500);
          }
        } else {
          setGameStatus('Your turn!');
        }
        
      } catch (err) {
        console.error('❌ Error in AI game:', err);
        setGameStatus('Error occurred');
      }
      
      return;
    }

    // Local mode - handle moves locally
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const winLine = checkWinner(newBoard, row, col, currentPlayer);
    if (winLine) {
      setWinningLine(winLine);
      setWinner(currentPlayer);
      setGameOver(true);
      setGameStatus(`${currentPlayer === 'X' ? 'Black' : 'White'} wins! 🎉`);
      return;
    }

    // Check for draw
    const isFull = newBoard.every(row => row.every(cell => cell !== null));
    if (isFull) {
      setGameOver(true);
      setGameStatus('Draw! 🤝');
      return;
    }

    // Switch player for local mode
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);
  };

  const handleRestart = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setCurrentPlayer('X');
    setGameOver(false);
    setWinner(null);
    setWinningLine(null);
    setShowAIResultModal(false);
    setAIResult(null);
    if (mode === 'local') {
      setGameStatus('Local multiplayer mode');
    } else if (mode === 'ai') {
      setGameStatus('Playing against AI');
      // Create new AI match
      createAIMatch();
    }
  };

  // Handle back to dashboard - leave room if from room
  const handleBackToDashboard = async () => {
    // Leave room if applicable
    if (roomCode) {
      try {
        await roomService.leaveRoom(roomCode);
      } catch (err) {
        console.error('Error leaving room:', err);
      }
    }
    
    // Navigation will be intercepted by NavigationGuard if game is in progress
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
                {currentPlayer === 'X' && (
                  <span className={`turn-indicator ${myPlayer === 'X' ? 'your-turn' : 'opponent-turn'}`}>
                    {myPlayer === 'X' ? 'YOUR TURN' : 'OPPONENT TURN'}
                  </span>
                )}
              </div>
              <div className={`player-display ${currentPlayer === 'O' ? 'active' : ''}`}>
                <span className="player-symbol">⚪ White (O)</span>
                <span className="player-name">{whitePlayer?.username || 'Loading...'}</span>
                {myPlayer === 'O' && <span className="you-badge">(You)</span>}
                {currentPlayer === 'O' && (
                  <span className={`turn-indicator ${myPlayer === 'O' ? 'your-turn' : 'opponent-turn'}`}>
                    {myPlayer === 'O' ? 'YOUR TURN' : 'OPPONENT TURN'}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <p className={`game-status ${gameOver ? 'game-over' : ''}`}>
            {gameStatus}
          </p>
        </div>

        {/* Show waiting spinner only for matchmaking (not for AI mode) */}
        {isWaiting && mode === 'online' && !gameOver ? (
          <div className="waiting-container">
            <div className="spinner"></div>
            <p>Waiting for opponent...</p>
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
            <button onClick={handleBackToDashboard} className="btn btn-secondary">
              Back to Dashboard
            </button>
          </div>
        )}

        {/* AI Result Modal - Shows for AI mode */}
        {mode === 'ai' && (
          <AIResultModal
            isOpen={showAIResultModal}
            onClose={handleRestart}
            onBackToDashboard={handleBackToDashboard}
            result={aiResult}
          />
        )}

        {/* Calculating ELO Screen - Shows when user leaves and waiting for backend */}
        {showCalculatingELO && (
          <div className="game-over-modal">
            <div className="modal-content">
              <div className="modal-icon">⏳</div>
              <h2 className="modal-title">Đang tính điểm...</h2>
              <p className="modal-message">
                Vui lòng đợi trong giây lát
              </p>
              <div className="spinner-container" style={{ marginTop: '20px' }}>
                <div className="spinner"></div>
              </div>
            </div>
          </div>
        )}

        {/* ELO Change Modal - Shows first for online matches */}
        {mode === 'online' && (
          <ELOChangeModal
            isOpen={showELOModal}
            onClose={() => {
              setShowELOModal(false);
              
              // If user was leaving voluntarily, navigate after showing ELO
              if (isLeavingGame && pendingNavigationRef.current) {
                console.log('🔴 ELO modal closed, navigating to:', pendingNavigationRef.current);
                const destination = pendingNavigationRef.current;
                pendingNavigationRef.current = null;
                setIsLeavingGame(false);
                navigate(destination);
              }
            }}
            matchResult={matchResult}
            eloData={eloData}
          />
        )}

        {/* Game Over Modal for Online Mode - Shows after ELO modal is closed */}
        {gameOver && mode === 'online' && !showELOModal && !isLeavingGame && (
          <div className="game-over-modal">
            <div className="modal-content">
              {winner === myPlayer ? (
                <>
                  <div className="modal-icon winner">🎉</div>
                  <h2 className="modal-title winner">Victory!</h2>
                  <p className="modal-message">
                    {endedByDisconnect 
                      ? 'You won! Your opponent disconnected.' 
                      : 'Congratulations! You won the match!'}
                  </p>
                </>
              ) : winner && winner !== myPlayer ? (
                <>
                  <div className="modal-icon loser">😔</div>
                  <h2 className="modal-title loser">Defeat</h2>
                  <p className="modal-message">
                    {endedByDisconnect
                      ? 'You lost by disconnection.'
                      : 'Better luck next time!'}
                  </p>
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
