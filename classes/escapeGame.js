const deck = require('../controllers/deck.controller');
const { io } = require('../bjApp');
const db = require('../config/db');


//games.push(new escapeGame(data.username, room, data.maxPlayer, data.bet));

class Game {
    constructor(creator, roomName, maxPlayer, bet) {
        this.creator = creator;
        this.maxPlayer = maxPlayer;
        this.room = roomName;
        this.players = [];
        this.timeOut;
        this._turn = 0;
        this.maxTurn = 0;
        this.current_turn = 0;
        this.isOnPlay = false;
        this.isDealing = false;
        this.bidFinished = false;
        this.gameAction = "";
        this.bet = bet;
    }

    reset() {
        this.resetTimeOut();
        this._turn = 0;
        this.current_turn = 0;
        this.dealer = [];
        this.isDealing = false;

        for (let i = 0; i < this.players.length; i++) {
            this.players[i].hand = [];
        }
    }

    bigTurnStart() {
        console.log("playerInfo");
        console.log(this.players[0].playerInfo);
        this.smallTurn = 0;
        this.bidFinished = false;
        this.winningTurn = 0;
        this.setPlayerCards();
        for (var i = 0; i < this.players.length; i++) {
            this.players[i].isPass = false;
            this.players[i].winningTurn = 0;
            this.players[i].looseTurn = 0;
        }
        this.gameAction = "bid";
        this.roomBroadCast("bigTurn:start", { turn: this._turn });
    }


    



    getMaxExp(level) {
        var exp = 100;
        for (var i = 2; i <= level; i++) {
            exp = exp * 11 / 10;
        }
        return exp;
    }

  



    roomBroadCast(perm, value) {
        for (var i = 0; i < this.players.length; i++) {
            if (!this.players[i].isLeave) {
                this.players[i].emit(perm, value);
            }
        }
    }
};

module.exports = Game