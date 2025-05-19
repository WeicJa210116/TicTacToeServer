from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
from random import randint
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class player(BaseModel):
    id: str
    name: str
    ip: str
    symbol: str = ""


class game(BaseModel):

    id: int
    players: List[player]
    turn: int
    current_player: player
    board: List[List[str]]
    winnerSynbol: str
    game_over: bool


class JoinGameRequest(BaseModel):
    player2Id: str  # Change to str to match frontend
    game_id: int


class NewGameRequest(BaseModel):
    player1Id: str  # Changed from int to str


class MoveRequest(BaseModel):
    game_id: int
    playerId: str  # Changed from int to str
    x: int
    y: int


players = []
games = []


@app.post("/newPlayer")
async def new_player(ip: str, name: str):
    new_player_obj = player(id=str(len(players) + 1), name=name, ip=ip)
    players.append(new_player_obj)
    return JSONResponse(
        content={
            "status": "success",
            "id": new_player_obj.id,
            "name": new_player_obj.name,
        }
    )


@app.post("/newgameRequest")
async def new_game_request(request: NewGameRequest):
    player_index = int(request.player1Id) - 1  # Convert string ID to index
    game_id = len(games) + 1
    new_game = game(
        id=game_id,
        players=[players[player_index]],
        turn=0,
        current_player=players[player_index],
        board=[["" for _ in range(3)] for _ in range(3)],
        winnerSynbol="",
        game_over=False,
    )
    games.append(new_game)
    return {"game_id": game_id}


@app.post("/joinGameRequest")
async def join_game_request(request: JoinGameRequest):
    player_index = int(request.player2Id) - 1  # Convert string ID to index
    games[request.game_id - 1].players.append(players[player_index])
    if randint(0, 1) == 1:
        games[request.game_id - 1].current_player = players[player_index]
    return {"game_id": request.game_id}


@app.post("/move")
async def move(request: MoveRequest):
    game = games[request.game_id - 1]
    player_index = int(request.playerId) - 1  # Convert string ID to index

    if game.game_over:
        raise HTTPException(status_code=400, detail="Game is over")
    if game.current_player.id != players[player_index].id:
        raise HTTPException(status_code=400, detail="Not your turn")
    if game.board[request.x][request.y] != "":
        raise HTTPException(status_code=400, detail="Invalid move")
    if game.turn % 2 == 0:
        game.board[request.x][request.y] = "X"
        game.current_player.symbol = "X"
    else:
        game.board[request.x][request.y] = "O"
        game.current_player.symbol = "O"

    game.turn = game.turn + 1

    for i in range(3):
        if game.board[i][0] == game.board[i][1] == game.board[i][2] != "":
            game.winnerSynbol = game.board[i][0]
            game.game_over = True
            break
        if game.board[0][i] == game.board[1][i] == game.board[2][i] != "":
            game.winnerSynbol = game.board[0][i]
            game.game_over = True
            break
    if game.board[0][0] == game.board[1][1] == game.board[2][2] != "":
        game.winnerSynbol = game.board[0][0]
        game.game_over = True
    if game.board[0][2] == game.board[1][1] == game.board[2][0] != "":
        game.winnerSynbol = game.board[0][2]
        game.game_over = True

    if game.game_over:
        games.pop(request.game_id - 1)

    game.current_player = game.players[game.turn % 2]
    return {"game": game, "winner": game.winnerSynbol}


@app.get("/getGame")
async def get_game(game_id: int):
    if game_id > len(games) or game_id < 1:
        raise HTTPException(status_code=404, detail="Game not found")
    return games[game_id - 1]


@app.get("/getGames")
async def get_games():
    return games


@app.get("/deleteGame")
async def delete_game(game_id: int):
    if game_id > len(games) or game_id < 1:
        raise HTTPException(status_code=404, detail="Game not found")
    games.pop(game_id - 1)
    return {"message": "Game deleted successfully"}
