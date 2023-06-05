const { io } = require('../bjApp');
const uuidv4 = require('uuid/v4');
const bcrypt = require('bcryptjs');

//const Game = require('../classes/game');
const escapeGame = require('../classes/escapeGame');
const deck = require('../controllers/deck.controller');
const db = require('../config/db');
const { login, signup,getShop, changeShop, sendglobalchat, receiveglobalchatlist, receiveglobalchatlistcount, updateglobalchattime, setselectedcharacter, upgradecharacter, getupgradecharacters, upgradeweapon, getupgradeweapons, selectweapon, getPuzzle, getMasterPuzzle, changePuzzle, checkAnswer, getNYTime, waitStartTime, updateBalance, finishedMatch,getMultiplayerStartTime, getLevelStatus, updateLevelStatus } = require("../config/constant");

var games = [];
var escapeGameRooms = [];
var currentlyNewYorkTimeString = "";
var multiplayerGameStatus = "waiting";
var MultiplayerStartTime = "";

currentDate = new Date(
    (new Date()).toLocaleString(
        'en-US',
        { timeZone: 'America/New_York' }
    )
);

  
io.on('connection', (socket) => {

    console.log('Player connected', socket.id);
    socket.isReady = false;
    socket.emit('player:connected', { 'message': 'Welcome 1.2 Local' });
    const queryPromise = (query) => {
        console.log("shows_query", query);
        return new Promise((resolve, reject) => {
            db.query(query, (error, results) => {
                if (error) {
                    return reject(error);
                }
                return resolve(results);
            });
        });
    };


    socket.on(login, async function (data) {
        console.log("this is login_____", data);
        const { username, password } = data;
        db.query("SELECT * from user where username = ?", username, async (err, result) => {
            if (err) {
                console.log(err);
                socket.emit(login, { success: false, error: err });
            }
            else if (result.length == 0) {
                console.log("this is empty", data);
                socket.emit(login, { success: false, error: "Invalid User" });
            }
            else {
                const isMatch = await bcrypt.compare(password, result[0].password);
                if (!isMatch) {
                    socket.emit(login, { success: false, error: "Wrong Password" });
                } else {
                    socket.userIndex = result[0]["id"];
                    socket.username = username;

                    console.log("this is success", data);
                    socket.emit(login, { success: true, data: result[0] });
                }
            }
        });
    });
    socket.on(changeShop, async function(data){
        console.log(data);
        const { user_id, color, font, background, balance } = data;
        db.query("UPDATE shop SET color = ?, font = ?, background = ? WHERE user_id = ?", [color, font, background, parseInt(user_id)], (err, result) => {
            if(err){
                console.log(err);
                socket.emit(changeShop, { success: false, error: err });
            }
            else{
                db.query("UPDATE user SET balance = ? WHERE id = ?", [parseInt(balance), parseInt(user_id)], (err, result) => {
                    if(err){
                        console.log(err);
                        socket.emit(changeShop, { success: false, error: err });
                    }else{
                        db.query("SELECT * from shop where user_id = ?", user_id, async (err, result) => {
                            socket.emit(changeShop, { success: true, data: result[0] });
                        });
                        
                    }   
                });
            }
        });
    });
    socket.on(updateLevelStatus, async function(data){
        console.log(data);
        const { user_id } = data;
        db.query("UPDATE user SET levelStatus = ? WHERE user_id = ?", [levelStatus, parseInt(user_id)], (err, result) => {
            if(err){
                console.log(err);
                socket.emit(updateLevelStatus, { success: false, error: err });
            }
            else{
                db.query("SELECT id, levelStatus from user where user_id = ?", user_id, async (err, result) => {
                    socket.emit(updateLevelStatus, { success: true, data: result[0] });
                });

            }
        });
    });
    socket.on(getShop, async function(data){

        const { user_id} = data;
        db.query("SELECT * from shop where user_id = ?", parseInt(user_id), async (err, result) => {
            console.log("sss", result[0]);
            socket.emit(getShop, { success: true, data: result[0] });
        });
    });
    socket.on(getLevelStatus, async function(data){

        const { user_id} = data;
        db.query("SELECT id, levelStatus from user where user_id = ?", parseInt(user_id), async (err, result) => {
            console.log("levelStatus", result[0]);
            socket.emit(getLevelStatus, { success: true, data: result[0] });
        });
    });
    socket.on(signup, async function (data) {
        console.log(data);
        const { email, username, password } = data;
        db.query("SELECT * from user where username = ?", data.username, async (err, result) => {
            if (err) {
                console.log(err);
                socket.emit(signup, { success: false, error: err });
            }
            else if (result.length == 0) {
                const salt = await bcrypt.genSalt(10);
                const nPassword = await bcrypt.hash(password, salt);
                db.query("INSERT INTO user (email, username, password) VALUES (?, ?, ?)", [email, username, nPassword], (err, result) => {
                    if (err) {
                        console.log(err);
                        socket.emit(signup, { success: false, error: err });
                    }
                    else {
                        socket.userIndex = result["insertId"];
                        socket.username = username;

                        db.query("INSERT INTO shop (user_id) VALUES (?)", result["insertId"], (err, result) => {
                            if(err){
                                console.log(err);
                            }else{

                                db.query("SELECT * from user where id = ?", socket.userIndex, (err, result3) => {
                                    socket.emit(signup, { success: true, data: result3[0] });
        
                                });
                            }
                        });


                    }
                });
            } else {
                socket.emit(signup, { success: false, error: "User exist!" });
            }
        });
    });
    socket.on(getPuzzle, async function (data) {
        console.log("getPuzzle_____", data);

        const { test } = data;
        let gameType = data["type"];
        let ts = Date.now();
        data = data['room'];
        let date_ob = new Date(ts);
        let date = date_ob.getDate();
        let month = date_ob.getMonth() + 1;
        let year = date_ob.getFullYear();
        let today = year + "-" + month + "-" + date;
        // prints date & time in YYYY-MM-DD format
        console.log(year + "-" + month + "-" + date);
        let query = "";
        if(gameType == "match"){
            if (data == "Room1") {
                query = "SELECT id, room1_puzzle_ids AS puzzle_ids, room1_master_puzzle_id AS master_puzzle_id, match_time FROM daily_puzzles Where date = ' " + today + "'";
            }
            else if (data == "Room2") {
                query = "SELECT id, room2_puzzle_ids AS puzzle_ids, room2_master_puzzle_id AS master_puzzle_id, match_time FROM daily_puzzles Where date = ' " + today + "'";
            }
            else if (data == "Room3") {
                query = "SELECT id, room3_puzzle_ids AS puzzle_ids, room3_master_puzzle_id AS master_puzzle_id, match_time FROM daily_puzzles Where date = ' " + today + "'";
            }
        }else{
            if (data == "Room1") {
                query = "SELECT id, room1_puzzle_ids AS puzzle_ids, room1_master_puzzle_id AS master_puzzle_id, match_time FROM daily_puzzles ";
            }
            else if (data == "Room2") {
                query = "SELECT id, room2_puzzle_ids AS puzzle_ids, room2_master_puzzle_id AS master_puzzle_id, match_time FROM daily_puzzles ";
            }
            else if (data == "Room3") {
                query = "SELECT id, room3_puzzle_ids AS puzzle_ids, room3_master_puzzle_id AS master_puzzle_id, match_time FROM daily_puzzles ";
            }
        }




        db.query(query, async (err, result) => {
            if (err) {
                console.log(err);
                socket.emit(getPuzzle, { success: false, error: err });
            }

            else if (result.length > 0) {

                let daily_problem_id = result[0]['id'];
                let puzzle_ids = result[0]['puzzle_ids'];
                //puzzle_ids = "("  + puzzle_ids + ")";
                console.log("this is resultl", puzzle_ids);

                let master_puzzle_id = result[0]['master_puzzle_id'];
                let puzzle_paths = [];

                let match_time = result[0]['match_time'];;


                puzzle_ids = puzzle_ids.split(",");

                for (i = 0; i < puzzle_ids.length; i++) {

                    if (puzzle_ids[i] != 1111) {
                        puzzle_path_get_query = "SELECT puzzle_id, puzzle_path, puzzle_score, bubble_use, bubble_count, bubble_time, bubble_hint_type, bubble_hint_string FROM puzzles WHERE puzzle_id = " + puzzle_ids[i];

                        query_result = await queryPromise(puzzle_path_get_query);
                        if (query_result.length === 0) {
                            // Handle the case when the query result is empty
                            // For example, you can set default values or skip further processing
                            continue; // Skip to the next iteration
                        }

                        //query_result = JSON.stringify(query_result);
                        if (query_result[0]['puzzle_score'] === null) {
                            query_result[0]['puzzle_score'] = 0;
                        }
                        if (query_result[0]['bubble_use'] === null) {
                            query_result[0]['bubble_use'] = 0;
                        }
                        if (query_result[0]['bubble_count'] === null) {
                            query_result[0]['bubble_count'] = 0;
                        }
                        if (query_result[0]['bubble_time'] === null) {
                            query_result[0]['bubble_time'] = 0;
                        }
                        if (query_result[0]['bubble_hint_type'] === null) {
                            query_result[0]['bubble_hint_type'] = 0;
                        }
                        if (query_result[0]['bubble_hint_string'] === null) {
                            query_result[0]['bubble_hint_string'] = "";
                        }
                        puzzle_paths.push(query_result[0]);

                    } else {
                        puzzle_paths.push("emptyImage");
                    }

                }

                socket.emit(getPuzzle, { success: true, data: { daily_problem_id: daily_problem_id, match_time: match_time, puzzle_paths: puzzle_paths } });




            }
        });


    });
    
    socket.on(checkAnswer, async function (data) {
        console.log(data);
        const { answer, puzzle_id } = data;

        if (answer[answer.length - 1] == ',')
            lastAnswer = answer.substring(0, answer.length - 1);
        else
            lastAnswer = answer;
        console.log("answer=", lastAnswer);
        var answerString = lastAnswer.split(',');
        //        answerString = answerString.sort((a, b) => a - b);
        answerString = answerString.sort();


        var verifyResult = false;
        db.query("SELECT * from puzzles where puzzle_id = ? ", puzzle_id, async (err, result) => {
            if (err) {
                console.log(err);
                socket.emit(getPuzzle, { success: false, error: err });
            }
            else if (result.length > 0) {
                if (result[0]["puzzle_answer"] != null) {
                    var correctAnswer = result[0]["puzzle_answer"];
                    correctAnswer = correctAnswer.split(',');
                    //correctAnswer = correctAnswer.sort((a, b) => a - b);
                    console.log("TEST", correctAnswer);
                    correctAnswer = correctAnswer.map(Function.prototype.call, String.prototype.trim)
                    correctAnswer = correctAnswer.sort();

                    console.log("compare Two array", answerString, "_______", correctAnswer);
                    if (JSON.stringify(answerString) == JSON.stringify(correctAnswer)) {
                        console.log("this answer is true");
                        verifyResult = true;
                    } else {
                        console.log("this answer is not true");
                    }

                }
                socket.emit("getVerifyResult", { success: true, data: verifyResult });
            }
        });

        

    });
    


    socket.on('disconnect', function () {
        console.log(socket.username ? socket.username : socket.id, 'is disconnected');
        let room = socket.myRoom;
        let gameIndex = socket.gameIndex;
        let username = socket.username;

        try {
            if (gameIndex < 0 || typeof gameIndex === 'undefined') {
                console.log(socket.username ? socket.username : socket.id, 'Was not part of a room');
                return;
            }
            console.log('my room was', room, games.length);

            if (!games[gameIndex].isOnPlay) {
                var index = games[gameIndex].players.indexOf(socket);
                if (index > -1) {
                    games[gameIndex].players.splice(index, 1);
                }
                console.log("disconnected" + username);
            }
            else {
                socket.isLeave = true;
                console.log("disconnected1" + username);

            }

            io.emit('room:list', { "rooms": GetPublicRooms() });
            let seat = socket.seat;
            games[gameIndex].roomBroadCast('player:leave', { seat });
            //EraseEmptyRooms();
        } catch (err) {
            console.log(err);
        }
    });

    socket.on('player:leave', function () {
        try {
            console.log('ALV', socket.username ? socket.username : socket.id, 'exit the room');
            let room = socket.myRoom;
            console.log('leaved the room', room);
            let i = socket.gameIndex;
            

            
        } catch (err) {
            console.log(err);
        }
    });
    socket.on('room:join', function (data) {
        console.log("data", data);
        const findRoom = escapeGameRooms.includes(data.selectedRoomName);
        console.log("escapeGameRooms", escapeGameRooms);
        console.log("joinRoom", findRoom, data.members, data.maxPlayer);
        if (findRoom) { //If room exist
            if (parseInt(data.members) < parseInt(data.maxPlayer)) { // Join room if is not full
                SetSocketPropierties(socket, data);
                socket.join(data.selectedRoomName);
                socket.gameIndex = GetGameIndex(data.selectedRoomName);
                console.log("socket.gameIndex", socket.gameIndex);
                if (games[socket.gameIndex].players.indexOf(socket) >= 0)
                    return;
                const i = socket.gameIndex;
                games[i].players.push(socket);

                console.log(data.username, 'Is joining the room...', data.selectedRoomName);
                console.log("___", GetPlayersInfoFromRoom(socket.gameIndex));


                socket.myRoom = data.selectedRoomName;
                socket.emit('room:joined', { 'roomName': socket.myRoom, 'roomIndex': socket.gameIndex });
                io.emit('room:list', { 'rooms': GetPublicRooms() });
                games[i].roomBroadCast('user:list', { 'players': GetPlayersInfoFromRoom(socket.gameIndex) });
            } else {
                console.log(data.username, 'found room full...');
                socket.emit('err:room', { 'message': 'The room you try to access is full. Choose another.', 'flag': 2 });
                return;
            }
            //io.emit('user:list', { 'players': GetPlayersInfoFromRoom(socket.gameIndex) });

        } else {
            console.log("Room does not exist.");
            socket.emit('err:room', { 'message': 'The room you try to access does not exist. Choose another or create one.', 'flag': 1 });
        }
    });
    socket.on('room:list', function (data) {
        socket.emit('room:list', { 'rooms': GetPublicRooms() });
    });
    
    
});


/*
General functions
*/
function FirstDeal(index) {
    console.log('On Inital Deal');
    InitialDeal(index);
    let timeOut = setTimeout(() => {
        clearTimeout(timeOut);
        CheckInsurance(index);

    }, 3500);
}




function SetSocketPropierties(socket, data) {
    socket.username = data.username;
    socket.hand = [];
    socket.playerInfo = {};
    socket.seat = -1;
    socket.isReady = false;
    socket.isEnded = false;
    socket.score = 0;
    socket.looseScore = 0;
    socket.looseTurn = 0;
    socket.winningTurn = 0;
    socket.isPass = false;
    socket.isLeave = false;
    socket.id = data.id;
    socket.eventId = data.eventId;
    socket.eventTime = data.eventTime;
}