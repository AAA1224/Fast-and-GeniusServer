const mysql = require('mysql')
const db = mysql.createConnection({
    host: "212.1.214.210",
    user: "toprose",
    password: "!nikitaSemenov123!",
    database: "fastgenius"
});
// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "",
//     database: "fastgenius"
// });
db.connect((err) => {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log("MySql Connected");
    console.log(err);
})
module.exports = db;


