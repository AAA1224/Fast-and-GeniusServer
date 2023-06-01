const deckController = {};
var FisherYattes = require('fisher-yates');
var MersenneTwister = require('mersenne-twister');
const { hash } = require('enigma-hash');

deckController.CreateDeck = (customSeed, customKey, totalDecks) =>
{
    const hashValue = hash(customSeed, 'sha256', 'hex', customKey)
    let numHex = parseInt('0x' + hashValue.substr(0, 4));
    let rgn = new MersenneTwister(numHex);

    const suits = ['A_', 'B_', 'C_', 'D_'];
    let faces = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
    let i;

    // for (i = 0; i < totalDecks - 1; i++) {
    //     faces = faces.concat(['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K']);
    // }
    const sortedDeck = suits.map(suit => faces.map(face => suit + face));
    deck = sortedDeck[0].concat(sortedDeck[1], sortedDeck[2], sortedDeck[3]);
    return FisherYattes(deck, () => { return rgn.random(); });
}

deckController.CreateSit = (customSeed, customKey) => {
    const hashValue = hash(customSeed, 'sha256', 'hex', customKey)
    let numHex = parseInt('0x' + hashValue.substr(0, 4));
    let rgn = new MersenneTwister(numHex);
    sit = [{
        pos: 0,
        sit: false
    },{
        pos: 1,
        sit: false
    },{
        pos: 2,
        sit: false
    },{
        pos: 3,
        sit: false
    }];
    return FisherYattes(sit, () => {return rgn.random();});
}

deckController.CreateDebugDeck = (customSeed, customKey, totalDecks) =>
{
    const hashValue = hash(customSeed, 'sha256', 'hex', customKey)
    let numHex = parseInt('0x' + hashValue.substr(0, 4));
    let rgn = new MersenneTwister(numHex);

    const suits = ['h', 'd', 's', 'c'];
    let faces = ['8', '8', '8', '8', '8', '8', '8', '8', '8', '8', '8', '8', '8'];
    let i;

    for (i = 0; i < totalDecks - 1; i++) {
        faces = faces.concat(['8', '8', '8', '8', '8', '8', '8', '8', '8', '8', '8', '8', '8']);
    }
    const sortedDeck = suits.map(suit => faces.map(face => face + suit));
    deck = sortedDeck[0].concat(sortedDeck[1], sortedDeck[2], sortedDeck[3]);
    return FisherYattes(deck, () => { return rgn.random(); });
}

deckController.CreateSeed = () => {
    let seed = Math.random().toString(36).slice(-10);
    console.log(seed);
    return seed;
}

deckController.GetDeck = (req, res) => {

    var mainDeck = this.CreateDeck(req.player._clientSeed, req.player._serverSeed, req.player._deckNumber);
    res.json({
        cards: mainDeck
    });
}

deckController.GetCard = (req, res) => {

    var mainDeck = this.CreateDeck(req.player._clientSeed, req.player._serverSeed, req.player._deckNumber);

    if (req.body.id < faces.length * suits.length) {
        res.json({
            card: mainDeck[req.body.id],
            nextTurn: ++req.body.id
        })
    }
    else {
        res.json({
            card: mainDeck[0],
            nextTurn: 1
        });

    }
}


module.exports = deckController;