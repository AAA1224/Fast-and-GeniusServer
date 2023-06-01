const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { getPreviousMonday, getNextMonday, getThisMonday } = require('../config/global');

router.post("/user/register", (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const gender = req.body.gender;
    const age = req.body.age;
    const savedId = req.body.savedId;
    console.log(req.body);
    db.query("SELECT * FROM user WHERE id = ?", savedId, (err, result) => {
        if (err) {
            console.log(err);
        }
        if (result.length == 0) {
            db.query("INSERT INTO user (name, email, gender, age, level, exp, coin, crystal, isVIP, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [name, email, gender, age, 1, 0, 1000, 10, 0, 1], (err, result) => {
                if (err) {
                    console.log(err);
                    res.json({ success: false, error: err });
                }
                const insertedId = result["insertId"];
                if (email == "" || email == undefined || email == null) {
                    db.query("UPDATE user SET name='GUEST?' where id = ?", [insertedId, insertedId], (err, result) => {
                        if (err) {
                            res.json({ success: false, error: err });
                            console.log(err);
                        }
                        res.json({ success: true, id: insertedId });
                    });
                }
            });
        } else {
            res.json({ success: true });
        }
    });
});

router.post("/user/getData", (req, res) => {
    const id = req.body.id;
    db.query("select name, 'success', level, exp, gameCount, winCount from user LEFT JOIN (SELECT count (*) as gameCount, userId from gameresult WHERE userId = ?) AS a ON a.userId = user.id LEFT JOIN (SELECT count(*) as winCount, userId from gameresult WHERE userId = ? AND isWin = 1) AS b ON b.userId = user.id where id = ?", [id, id, id], (err, result) => {
        try {
            if (err) {
                res.json({ success: false, error: err });
            }
            result[0].success = true;
            res.json(result[0]);
        } catch (e) {
            console.log(id);
            console.log(result);
        }
    });
});

router.post("/user/setUserName", (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    db.query("UPDATE user SET name = ? WHERE id = ?", [name, id], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        db.query("select name, 'success', level, exp, gameCount, winCount from user LEFT JOIN (SELECT count (*) as gameCount, userId from gameresult WHERE userId = ?) AS a ON a.userId = user.id LEFT JOIN (SELECT count(*) as winCount, userId from gameresult WHERE userId = ? AND isWin = 1) AS b ON b.userId = user.id where id = ?", [id, id, id], (err, result) => {
            try {
                if (err) {
                    res.json({ success: false, error: err });
                }
                result[0].success = true;
                res.json(result[0]);
            } catch (e) {
                console.log(id);
                console.log(result);
            }
        });
    });
});

router.post("/user/buyCrystal", (req, res) => {
    const userid = req.body.id;
    const crystal = req.body.crystal;
    const money = parseFloat(req.body.money);
    db.query("INSERT into crystalshop (userId, crystal, money, date) VALUES (?, ?, ?, ?)", [userid, crystal, money, new Date()], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        db.query("UPDATE user SET crystal = crystal + ? WHERE id = ?", [crystal, userid], (err, result) => {
            if (err) {
                res.json({ success: false, error: err });
            }
            db.query("SELECT *, 'success' from user where id = ?", userid, (err, result) => {
                try {
                    if (err) {
                        res.json({ success: false, error: err });
                    }
                    result[0].success = true;
                    res.json(result[0]);
                } catch (e) {
                    console.log(result);
                }
            });
        });
    });
});

router.post("/user/buyCoin", (req, res) => {
    const userid = req.body.id;
    const coin = req.body.coin;
    const crystal = req.body.crystal;
    db.query("SELECT * from user WHERE id = ?", userid, (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        if (result.length == 0) {
            res.json({ success: false, error: "SCAM" });
        }
        else if (result[0]["crystal"] < crystal) {
            res.json({ success: false, error: "SMALL CRYSTAL" });
        } else {
            db.query("INSERT into coinshop (userId, coin, crystal, date) VALUES (?, ?, ?, ?)", [userid, coin, crystal, new Date()], (err, result) => {
                if (err) {
                    res.json({ success: false, error: err });
                }
                console.log(coin + ":" + crystal);
                db.query("UPDATE user SET coin = coin + ?, crystal = crystal - ? WHERE id = ?", [parseInt(coin), parseInt(crystal), userid], (err, result) => {
                    if (err) {
                        res.json({ success: false, error: err });
                    }
                    db.query("SELECT *, 'success' from user where id = ?", userid, (err, result) => {
                        try {
                            if (err) {
                                res.json({ success: false, error: err });
                            }
                            result[0].success = true;
                            res.json(result[0]);
                        } catch (e) {
                            console.log(result);
                        }
                    });
                });
            });
        }
    });
});

router.post("/user/getVIP", (req, res) => {
    const id = req.body.id;
    db.query("UPDATE user SET isVIP = 1 WHERE id = ?", id, (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        db.query("SELECT *, 'success' from user WHERE id = ?", id, (err, result) => {
            try {
                if (err) {
                    res.json({ success: false, error: err });
                }
                result[0].success = true;
                res.json(result[0]);
            } catch (e) {
                console.log(result);
            }
        });
    })
});

router.post("/user/playGameRoom", (req, res) => {
    const id = req.body.id;
    const prize = req.body.prize;
    const entry = req.body.entry;
    const isVIP = req.body.isVIP;
    const roomName = req.body.roomName;
    db.query("SELECT * from user WHERE id = ?", id, (err, result) => {
        if (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }

        if (result[0].coin >= entry) {
            if (isVIP == 1 && result[0].isVIP == 0) {
                console.log("NO VIP");
                res.json({ success: false, error: "NO VIP" });
            } else {
                db.query("UPDATE user SET coin = coin - ? WHERE id = ?", [entry, id], (err, result) => {
                    if (err) {
                        res.json({ success: false, error: err });
                    }
                    res.json({ success: true, prize: prize, roomName: roomName });
                });
            }
        } else {
            res.json({ success: false, error: "SMALL COIN" });
        }
    });
});

router.post("/user/getDailyEvent", (req, res) => {
    const id = req.body.id;
    const eventTime = req.body.eventTime;
    db.query("SELECT * from dailyEvent WHERE userId = ? AND eventTime = ?;", [id, eventTime], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        if (result.length == 0) {
            db.query("INSERT into dailyEvent (userId, gameCount, winCount, eventTime) VALUES (?, ?, ?, ?);", [id, 0, 0, eventTime], (err, result) => {
                if (err) {
                    res.json({ success: false, error: err });
                }
                res.json({ success: true, gameCount: 0, winCount: 0, eventId: result["insertId"] });
            });
        } else {
            res.json({ success: true, gameCount: result[0].gameCount, winCount: result[0].winCount, eventId: result[0].id });
        }
    });
});

router.post("/user/getPrevWeekRank", (req, res) => {
    const prevMonday = getPreviousMonday();
    const thisMonday = getThisMonday();
    db.query("SELECT `user`.id, a.coin, level, name FROM USER LEFT JOIN ( SELECT count(*) AS gameCount, gameRoomId, SUM( coin ) AS coin, userId FROM gameresult LEFT JOIN gameroom ON gameroom.id = gameresult.gameRoomId WHERE gameroom.createdTime BETWEEN ? AND ? GROUP BY userId ) AS a ON a.userId = USER.id LEFT JOIN ( SELECT count(*) AS winCount,    userId FROM gameresult LEFT JOIN gameroom ON gameroom.id = gameresult.gameRoomId WHERE gameroom.createdTime BETWEEN ? AND ? AND isWin = 1 GROUP BY userId ) AS b ON b.userId = USER.id WHERE !ISNULL( a.gameCount ) ORDER BY winCount DESC LIMIT 30", [prevMonday, thisMonday, prevMonday, thisMonday], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        res.json({ success: true, data: result });
    })
});

router.post("/user/getThisWeekRank", (req, res) => {
    const nextMonday = getNextMonday();
    const thisMonday = getThisMonday();
    db.query("SELECT `user`.id, a.coin, level, name FROM USER LEFT JOIN ( SELECT count(*) AS gameCount, gameRoomId, SUM( coin ) AS coin, userId FROM gameresult LEFT JOIN gameroom ON gameroom.id = gameresult.gameRoomId WHERE gameroom.createdTime BETWEEN ? AND ? GROUP BY userId ) AS a ON a.userId = USER.id LEFT JOIN ( SELECT count(*) AS winCount,    userId FROM gameresult LEFT JOIN gameroom ON gameroom.id = gameresult.gameRoomId WHERE gameroom.createdTime BETWEEN ? AND ? AND isWin = 1 GROUP BY userId ) AS b ON b.userId = USER.id WHERE !ISNULL( a.gameCount ) ORDER BY winCount DESC LIMIT 30", [thisMonday, nextMonday, thisMonday, nextMonday], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        const currentDate = new Date();
        res.json({ success: true, data: result, year: currentDate.getFullYear(), month: currentDate.getMonth(), day: currentDate.getDate(), hour: currentDate.getHours, min: currentDate.getMinutes, sec: currentDate.getSeconds, year1: nextMonday.getFullYear(), month1: nextMonday.getMonth(), day1: nextMonday.getDate(), hour1: nextMonday.getHours(), min1: nextMonday.getMinutes(), sec1: nextMonday.getSeconds(), finishDate: nextMonday });
    })
});

router.post("/user/findFriend", (req, res) => {
    const id = req.body.id;
    const name = req.body.name;
    db.query("SELECT * from user WHERE name = ?", name, (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        if (result.length == 0) {
            res.json({ success: false, error: "NO FRIEND" });
        }

        db.query("INSERT into friendrequest (fromid, toid, status) VALUES (?, ?, ?)", [id, result[0].id, 0], (err, result) => {
            if (err) {
                res.json({ success: false, error: err });
            }
            res.json({ success: true });
        });
    });
});

router.post("/user/getFriendRequest", (req, res) => {
    const id = req.body.id;
    db.query("SELECT friendrequest.id, friendrequest.fromid, user.name from friendrequest LEFT JOIN user ON user.id = friendrequest.fromid where toid = ? AND status = 0 LIMIT 1", id, (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        if (result.length == 0) {
            console.log("false");
            res.json({ success: false });
        }
        else {
            res.json({ success: true, reqid: result[0].id, id: result[0].fromid, name: result[0].name });
        }
    })
});

router.post("/user/getFriendRequestSuccess", (req, res) => {
    const id = req.body.id;
    db.query("SELECT * from friendrequest WHERE fromid = ? AND status = 1", id, (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        if (result.length == 0) {
            res.json({ success: false });
        }
        else {
            for (var i = 0; i < result.length; i++) {
                db.query("DELETE from friendrequest WHERE id = ?", result[0].id, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            res.json({ success: true });
        }
    })
});

router.post("/user/setFriendRequest", (req, res) => {
    const id = req.body.id;
    const status = req.body.status;
    const fromId = req.body.fromId;
    const toId = req.body.toId;
    db.query("UPDATE friendrequest SET status = ? WHERE id = ?", [status, id], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        if (status == 1 && result["changedRows"] == 1) {
            db.query("INSERT into friends (fromId, toId) VALUES (?, ?)", [fromId, toId], (err, result) => {
                if (err) {
                    res.json({ success: false, error: err });
                }
                else {
                    res.json({ success: true });
                }
            });
        } else if (status == 2 && result["changedRows"] == 1) {
            res.json({ success: true });
        }
    });
})

router.post("/user/getFriends", (req, res) => {
    const id = req.body.id;
    console.log("id:" + id);
    db.query("SELECT * from (SELECT user.name, user.id, user.`level` from friends LEFT JOIN user ON user.id = friends.fromId AND friends.toId = ? UNION SELECT user.name, user.id, user.`level` from friends LEFT JOIN user ON user.id = friends.toId AND friends.fromId = ?) AS a WHERE !ISNULL(a.name)", [id, id], (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        } else {
            console.log(result);
            res.json({ success: true, data: result });
            
        }
    });
});


router.post("/saveData", (req, res) => {
    const data = req.body.data;
    console.log(data);
    db.query("UPDATE savedata SET data = ? WHERE id = 1", data, (err, result) => {
        if (err) {
            res.json({ success: false, error: err });
        }
        res.json({ success: true });
    });
});

router.get("/getSaveData", (req, res) => {
    db.query("SELECT data from savedata WHERE id = 1", (err, result) => {
        if (err) {
            res.json({ error: err });
        }
        res.json({ data: result[0].data });
    });
});


module.exports = router;