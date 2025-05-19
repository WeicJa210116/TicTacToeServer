const API_BASE_URL = 'http://192.168.178.34:80';

let currentGame = null;
let playerId = null;
let gameId = null;

async function registerPlayer() {
    const name = document.getElementById('playerName').value;
    if (!name) return alert('Please enter a name');
    
    try {
        const queryParams = new URLSearchParams({
            ip: 'local',
            name: name
        }).toString();
        
        const response = await fetch(`${API_BASE_URL}/newPlayer?${queryParams}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server did not return JSON');
        }
        
        const data = await response.json();
        console.log('Response data:', data); // Debug log
        
        if (data && data.id) {
            playerId = data.id;
            document.getElementById('registration').style.display = 'none';
            document.getElementById('gameControls').style.display = 'block';
            document.getElementById('playerInfo').textContent = `Player: ${name} (ID: ${playerId})`;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Registration failed:', error);
        alert(`Failed to register: ${error.message}`);
    }
}

async function createGame() {
    try {
        const response = await fetch(`${API_BASE_URL}/newgameRequest`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                player1Id: playerId  // Remove parseInt
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create game: ${response.status}`);
        }

        const data = await response.json();
        gameId = data.game_id;
        await updateGame();
        document.getElementById('gameId').textContent = `Game ID: ${gameId}`;
    } catch (error) {
        console.error('Create game error:', error);
        alert('Failed to create game: ' + error.message);
    }
}

async function joinGame() {
    const gameToJoin = document.getElementById('joinGameId').value;
    if (!gameToJoin) return alert('Please enter a game ID');
    
    try {
        const response = await fetch(`${API_BASE_URL}/joinGameRequest`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                player2Id: playerId, // Remove parseInt here since ID is already a string
                game_id: parseInt(gameToJoin) 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to join game: ${response.status}`);
        }
        
        const data = await response.json();
        gameId = data.game_id;
        await updateGame();
    } catch (error) {
        console.error('Join game error:', error);
        alert('Failed to join game: ' + error.message);
    }
}

async function makeMove(x, y) {
    if (!currentGame || currentGame.game_over) return;
    if (currentGame.current_player.id !== playerId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/move`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                game_id: parseInt(gameId), 
                    playerId: playerId,  // Remove parseInt
                x: parseInt(x), 
                y: parseInt(y) 
            })
        });

        if (!response.ok) {
            throw new Error(`Move failed: ${response.status}`);
        }

        const data = await response.json();
        await updateGame();
        
        if (data.winner) {
            alert(`Game Over! Winner: ${data.winner}`);
        }
    } catch (error) {
        console.error('Move error:', error);
        alert('Invalid move: ' + error.message);
    }
}

async function updateGame() {
    if (!gameId) return;
    
    const response = await fetch(`${API_BASE_URL}/getGame?game_id=${gameId}`);
    currentGame = await response.json();
    updateBoard();
}

function updateBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = currentGame.board[i][j];
            cell.onclick = () => makeMove(i, j);
            board.appendChild(cell);
        }
    }
    
    const status = document.getElementById('status');
    if (currentGame.game_over) {
        status.textContent = `Game Over! Winner: ${currentGame.winnerSynbol}`;
    } else {
        status.textContent = `Current player: ${currentGame.current_player.name}`;
    }
}

async function updateGamesList() {
    try {
        const response = await fetch(`${API_BASE_URL}/getGames`);
        const games = await response.json();
        const gamesListElement = document.getElementById('activeGames');
        gamesListElement.innerHTML = '';

        if (games.length === 0) {
            gamesListElement.innerHTML = '<p>No active games</p>';
            return;
        }

        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            
            const players = game.players.map(p => p.name).join(' vs ');
            const status = game.game_over ? 'Finished' : 'In Progress';
            const currentPlayer = game.current_player ? `Current Turn: ${game.current_player.name}` : '';

            gameCard.innerHTML = `
                <h3>Game #${game.id}</h3>
                <p>Players: ${players}</p>
                <p>Status: ${status}</p>
                ${!game.game_over ? `<p>${currentPlayer}</p>` : ''}
                ${game.winnerSynbol ? `<p>Winner: ${game.winnerSynbol}</p>` : ''}
            `;

            if (!game.game_over && game.players.length < 2) {
                const joinButton = document.createElement('button');
                joinButton.className = 'btn secondary';
                joinButton.textContent = 'Join Game';
                joinButton.onclick = () => {
                    document.getElementById('joinGameId').value = game.id;
                    joinGame();
                };
                gameCard.appendChild(joinButton);
            }

            gamesListElement.appendChild(gameCard);
        });
    } catch (error) {
        console.error('Failed to fetch games:', error);
    }
}

// Poll for game updates every 2 seconds
setInterval(() => {
    updateGame();
    updateGamesList();
}, 2000);

// Initial load of games
document.addEventListener('DOMContentLoaded', updateGamesList);

// Add this function to help with debugging
function checkGameControls() {
    const controls = document.getElementById('gameControls');
    console.log('Game controls display:', controls.style.display);
    console.log('Player ID:', playerId);
}
