const deck = require('../controllers/deck.controller');
const { io } = require('../bjApp');
const db = require('../config/db');


//games.push(new Game(room, data.gameType, data.gameRound, data.prizeCoin, data.prizeCrystal));


class Game {
    constructor(roomName, type, round, prizeCoin, prizeCrystal, roomType, gameRoomName) {
        this.room = roomName;
        this.gameRoomName = gameRoomName;
        this.players = [];
        this.dealer = [];
        this.timeOut;
        this.gameType = type;
        this.gameRound = round;
        this.roomType = roomType;
        this._turn = 0;
        this.maxTurn = 0;
        this.current_turn = 0;
        this.isOnPlay = false;
        this.isDealing = false;
        this.bidFinished = false;
        this.cardType = "A";
        this.bidValue = 6;
        this.dealedPlayer = 0;
        this.firstDealedCard = "";
        this.bidTurn = 0;
        this.winningTurn = 0;
        this.smallTurn = 0;
        this.botTimer = null;
        this.prizeCoin = prizeCoin;
        this.prizeCrystal = prizeCrystal;
        this.gameAction = "";
        this.sit = deck.CreateSit(this.room, deck.CreateSeed());
        this.gameId = 0;
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

    nextBid(bid) {
        this.bidValue = bid;
        if (bid == 13) {
            this.bidTurn = this._turn;
            this.dealedPlayer = 0;
            this.roomBroadCast("game:selecttype", { turn: this._turn });
            // this.roomBroadCast("smallTurn:start", { turn: this._turn });
            this.smallTurnStart();
            this.gameAction = "type";
            this.checkBot();
            return;
        }
        var turn = this.checkPlayerPass();
        if (turn == -1 && this.bidValue == 6) {
            this.setPlayerCards();
            for (var i = 0; i < this.players.length; i++) {
                this.players[i].isPass = false;
            }
            this._turn = (this._turn + 1) % 4;
            console.log("refreshnextBid:" + this._turn);
            this.roomBroadCast("player:nextBid", { turn: this._turn });
            this.gameAction = "bid";
            this.checkBot();
            return;
        }
        if (turn == this._turn || turn == -1 || turn == this.maxTurn) {
            if (turn == this.maxTurn) {
                this._turn = this.maxTurn;
            }
            this.bidTurn = this._turn;
            this.dealedPlayer = 0;
            this.roomBroadCast("game:selecttype", { turn: this._turn });
            // this.roomBroadCast("smallTurn:start", { turn: this._turn });
            this.smallTurnStart();
            this.gameAction = "type";
            this.checkBot();
        } else {
            console.log("nextBidStart:" + turn);
            this._turn = turn;
            this.roomBroadCast("player:nextBid", { turn: this._turn });
            this.gameAction = "bid";
            this.checkBot();
            // io.in(this.room).emit("player:nextBid", { turn: this._turn });
        }
    }

    smallTurnStart() {
        this.roomBroadCast("game:smallTurn", { turn: this.smallTurn });
        this.dealedPlayer = 0;
        this.firstDealedCard = "";
    }

    checkPlayerPass() {
        for (var i = (this._turn + 1); i < (this._turn + 4); i++) {
            var turn = i % 4;
            var player = null;
            for (var j = 0; j < 4; j++) {
                if (turn == this.players[j].seat) {
                    player = this.players[j];
                    // break;
                }
            }
            console.log(turn);
            console.log("playerSeat:", player.seat);
            console.log("isPass:", player.isPass);
            if (!player.isPass) {
                return player.seat;
            }
        }
        return -1;
    }

    checkSmallTurn() {
        this.smallTurn++;
        var maxCard = this.players[(this._turn + 1) % 4].dealedCard;
        this.maxTurn = this.players[(this._turn + 1) % 4].seat;

        for (var i = 0; i < this.players.length; i++) {
            if (maxCard.split("_")[0] == this.players[i].dealedCard.split("_")[0]) {
                if (parseInt(maxCard.split("_")[1]) < parseInt(this.players[i].dealedCard.split("_")[1])) {
                    maxCard = this.players[i].dealedCard;
                    this.maxTurn = this.players[i].seat;
                }
            } else {
                if (this.players[i].dealedCard.split("_")[0] == this.cardType) {
                    maxCard = this.players[i].dealedCard;
                    this.maxTurn = this.players[i].seat;
                }
            }
        }
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].seat == this.maxTurn || this.players[i].seat == ((this.maxTurn + 2) % 4)) {
                this.players[i].winningTurn++;
                if (!this.players[i].isLeave) {
                    this.players[i].emit("player:winningTurn", { turn: this.players[i].winningTurn });
                }
            } else {
                this.players[i].looseTurn++;
                if (!this.players[i].isLeave) {
                    this.players[i].emit("player:looseTurn", { turn: this.players[i].looseTurn });
                }
            }
        }
        if (this.bidTurn == this.maxTurn || ((this.bidTurn + 2) % 4) == this.maxTurn) {
            this.winningTurn++;
        }
        if (this.smallTurn == 13) {
            if (this.winningTurn >= this.bidValue) {
                for (var i = 0; i < this.players.length; i++) {
                    if (this.players[i].seat == this.bidTurn || this.players[i].seat == ((this.bidTurn + 2) % 4)) {
                        console.log("seat:" + this.players[i].seat + "score:" + this.players[i].score);
                        this.players[i].score += this.bidValue;
                        if (!this.players[i].isLeave) {
                            this.players[i].emit("player:score", { turn: this.players[i].score });
                        }
                    }
                }
            } else {
                for (var i = 0; i < this.players.length; i++) {
                    if (this.players[i].seat == this.bidTurn || this.players[i].seat == ((this.bidTurn + 2) % 4)) {
                        console.log("seat:" + this.players[i].seat + "loosescore:" + this.players[i].looseScore);
                        console.log("bid:" + this.bidValue);
                        this.players[i].looseScore = this.players[i].looseScore + this.bidValue * 2;
                        console.log("seat:" + this.players[i].seat + "loosescore:" + this.players[i].looseScore);
                        if (!this.players[i].isLeave) {
                            this.players[i].emit("player:looseScore", { turn: this.players[i].looseScore });
                        }
                    } else {
                        console.log("seat:" + this.players[i].seat + "score:" + this.players[i].score);
                        console.log("bid:" + this.bidValue);
                        this.players[i].score = this.players[i].score + this.bidValue * 2;
                        console.log("seat:" + this.players[i].seat + "score:" + this.players[i].score);
                        if (!this.players[i].isLeave) {
                            this.players[i].emit("player:score", { turn: this.players[i].score });
                        }
                    }
                }
            }
            if (this.checkGameEnd()) {
                return;
            }
            this._turn = this.maxTurn;
            this.bigTurnStart();
            return;
        }
        this.botTimer = setTimeout(() => this.startNewSmallTurn(this), 2000);
    }

    startNewSmallTurn(gameRoom) {
        if (gameRoom.botTimer != null) {
            clearTimeout(gameRoom.botTimer);
        }
        gameRoom.roomBroadCast("smallTurn:start", { turn: gameRoom.maxTurn });
        gameRoom.smallTurnStart();
        gameRoom._turn = gameRoom.maxTurn;
    }

    checkGameEnd() {
        for (var i = 0; i < this.players.length; i++) {
            if (this.gameType == 0 || (this.gameType == 1 && this.players[i].score >= this.gameRound)) {
                this.sendGameResult();
                return true;
            }
        }
        return false;
    }

    sendGameResult() {
        const gameResult = [];
        var maxScore = 0;
        for (var i = 0; i < this.players.length; i++) {
            if (maxScore < this.players[i].score) {
                maxScore = this.players[i].score;
            }
        }
        for (var i = 0; i < this.players.length; i++) {
            if (maxScore == this.players[i].score) {
                this.players[i].playerInfo.exp = parseInt(this.players[i].playerInfo.exp) + 50;
            } else {
                this.players[i].playerInfo.exp = parseInt(this.players[i].playerInfo.exp) + 10;
            }
            var maxExp = this.getMaxExp(this.players[i].playerInfo.level);
            if (maxExp < this.players[i].playerInfo.exp) {
                this.players[i].playerInfo.level++;
                this.players[i].playerInfo.exp -= maxExp;
            }
            db.query("UPDATE user SET level = ?, exp = ?, coin = coin + ?, crystal = crystal + ? WHERE id = ?", [this.players[i].playerInfo.level, this.players[i].playerInfo.exp, maxScore == this.players[i].score ? this.prizeCoin : 0, maxScore == this.players[i].score ? this.prizeCrystal : 0, this.players[i].id], (err, result) => {
                if (err) {
                    console.log(err);
                }
            });
            if (maxScore == this.players[i].score) {
                db.query("UPDATE dailyevent SET winCount = winCount + 1 WHERE id = ?", this.players[i].eventId, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            db.query("INSERT into gameresult (userId, gameRoomId, coin, crystal, exp, isWin) VALUES (?, ?, ?, ?, ?, ?)", [this.players[i].id, this.gameId, maxScore == this.players[i].score ? this.prizeCoin : 0, maxScore == this.players[i].score ? this.prizeCrystal : 0, maxScore == this.players[i].score ? 50 : 10, maxScore == this.players[i].score ? 1 : 0], (err, result) => {
                if (err) {
                    console.log(err);
                }
            })
            gameResult.push({ seat: this.players[i].seat, score: this.players[i].score, win: maxScore == this.players[i].score ? 1 : 0, level: this.players[i].playerInfo.level, exp: this.players[i].playerInfo.exp });
        }
        this.roomBroadCast("game:end", { gameResult: gameResult, prizeCoin: this.prizeCoin, prizeCrystal: this.prizeCrystal });
    }

    getMaxExp(level) {
        var exp = 100;
        for (var i = 2; i <= level; i++) {
            exp = exp * 11 / 10;
        }
        return exp;
    }

    setPlayerCards() {
        const roomDeck = deck.CreateDeck(this.room, deck.CreateSeed(), 1);

        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 13; j++) {
                this.players[i].hand[j] = roomDeck[i * 13 + j];
            }
            this.players[i].hand.sort(function (a, b) {
                if (a.split("_")[0] > b.split("_")[0]) {
                    return -1;
                }
                else if (a.split("_")[0] < b.split("_")[0]) {
                    return 1;
                }
                else {
                    if (parseInt(a.split("_")[1]) > parseInt(b.split("_")[1])) {
                        return 1;
                    }
                    else if (parseInt(a.split("_")[1]) < parseInt(b.split("_")[1])) {
                        return -1;
                    }
                    return 0;
                }
            });
            if (!this.players[i].isLeave) {
                this.players[i].emit('player:hand', { hand: this.players[i].hand });
            }
        }
    }

    next_turn() {
        this._turn = (this._turn + 1) % 4;
        this.roomBroadCast("game:turn", { turn: this._turn });
        this.gameAction = "turn";
        this.checkBot();
        // io.in(this.room).emit("game:turn", { turn: this._turn });
    }

    checkBot() {
        console.log(this.gameAction);
        if(this.gameAction == "bid") {
            this.checkBotBid();
        }else if(this.gameAction == "type") {
            this.checkBotType();
        }else if(this.gameAction == "turn") {
            this.checkBotTurn(this);
        }
    }

    checkBotBid() {
        const botId = this.checkIsBot();
        console.log(botId);
        if (botId != -1) {
            if (this.bidValue != 13) {
                this.players[botId].bid = this.bidValue + 1;
                this.roomBroadCast("player:bid", { seat: this.players[botId].seat, bid: this.players[botId].bid });
                this.nextBid(this.players[botId].bid);
            }
        }
    }

    checkIsBot() {
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].seat == this._turn && this.players[i].isLeave) {
                return i;
            }
        }
        return -1;
    }

    checkBotType() {
        const botId = this.checkIsBot();
        if (botId != -1) {
            const items = ["A", "B", "C", "D"];
            this.cardType = items[Math.floor(Math.random()*items.length)];;
            this.roomBroadCast("player:type", { seat: this.players[botId].seat, type: this.cardType });
            this.botTimer = setTimeout(() => this.checkBotTurn(this), 2000);
        }
    }

    checkBotTurn(gameRoom) {
        const botId = gameRoom.checkIsBot();
        if (botId != -1) {
            if (gameRoom.botTimer != null) {
                clearTimeout(gameRoom.botTimer);
            }
            if (gameRoom.firstDealedCard == "") {
                gameRoom.players[botId].dealedCard = gameRoom.players[botId].hand[0];
                gameRoom.players[botId].hand.splice(0, 1);
            }
            else {
                var botCardHand = 0;
                for (var i = 0; i < gameRoom.players[botId].hand.length; i++) {
                    if(gameRoom.players[botId].hand[i].split("_")[0] = gameRoom.firstDealedCard.split("_")[0]) {
                        botCardHand = i;
                        break;
                    }
                }
                gameRoom.players[botId].dealedCard = gameRoom.players[botId].hand[botCardHand];
                gameRoom.players[botId].hand.splice(botCardHand, 1);
            }

            gameRoom.roomBroadCast('player:deal', { seat: gameRoom.players[botId].seat, card: gameRoom.players[botId].dealedCard });
            gameRoom.dealedPlayer++;
            if (gameRoom.dealedPlayer == 1) {
                gameRoom.firstDealedCard = gameRoom.players[botId].dealedCard;
            }
            if (gameRoom.dealedPlayer == 4) {
                gameRoom.checkSmallTurn();
            } else {
                gameRoom.next_turn();
            }
        }
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