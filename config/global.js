const getPreviousMonday = () => {
    var date = new Date();
    var day = date.getDay();
    var prevMonday = new Date();
    if (date.getDay() == 0) {
        prevMonday.setDate(date.getDate() - 7);
    }
    else {
        prevMonday.setDate(date.getDate() - (day - 1) - 7);
    }
    prevMonday.setHours(0);
    prevMonday.setMinutes(0);
    prevMonday.setSeconds(0);
    prevMonday.setMilliseconds(0);
    return prevMonday;
}

const getThisMonday = () => {
    var date = new Date();
    var day = date.getDay();
    var prevMonday = new Date();
    if (date.getDay() == 0) {
        prevMonday.setDate(date.getDate());
    }
    else {
        prevMonday.setDate(date.getDate() - (day - 1));
    }
    prevMonday.setHours(0);
    prevMonday.setMinutes(0);
    prevMonday.setSeconds(0);
    prevMonday.setMilliseconds(0);
    return prevMonday;
}

const getNextMonday = () => {
    var d = new Date();
    d.setDate(d.getDate() + (((1 + 7 - d.getDay()) % 7) || 7));
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

module.exports = {getPreviousMonday, getNextMonday, getThisMonday}