/* =========================================
   1. UTILITIES & CONFIG
   ========================================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
// Map for Poker Ranking (A is 14)
const VALUE_MAP = { "2":2, "3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "J":11, "Q":12, "K":13, "A":14 };

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* =========================================
   2. DECK CLASS
   ========================================= */
class Deck {
    constructor() { 
        this.reset(); 
    }
    
    reset() {
        this.cards = [];
        for (let suit of SUITS) {
            for (let value of VALUES) {
                let color = (suit === "♥" || suit === "♦") ? "red" : "black";
                this.cards.push({ suit, value, color, rank: VALUE_MAP[value] });
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() { 
        return this.cards.pop(); 
    }
}

/* =========================================
   3. UI HELPERS (Animation Support)
   ========================================= */
function createCardElement(cardObj, isFaceDown = false) {
    const el = document.createElement('div');
    el.classList.add('card');
    
    if (isFaceDown) {
        el.classList.add('card-back');
    } else {
        el.classList.add(cardObj.color);
        // HTML Structure matching CSS
        el.innerHTML = `
            <span class="card-top">${cardObj.value} ${cardObj.suit}</span>
            <span class="card-center">${cardObj.suit}</span>
            <span class="card-bottom">${cardObj.value} ${cardObj.suit}</span>
        `;
    }
    return el;
}

// Async function to add a card with delay
async function dealToUI(containerId, cardObj, isFaceDown = false) {
    const container = document.getElementById(containerId);
    const cardEl = createCardElement(cardObj, isFaceDown);
    container.appendChild(cardEl);
    await wait(300); // Wait for CSS animation
}

function updateStatus(msg) {
    document.getElementById('game-status').innerText = msg;
}

function updatePot(amount) {
    document.getElementById('pot-amount').innerText = amount;
}

function clearTable() {
    document.getElementById('community-cards').innerHTML = '';
    document.getElementById('player-hand').innerHTML = '';
    document.getElementById('cpu-hand').innerHTML = '';
}

/* =========================================
   4. HAND EVALUATOR (Poker Logic)
   ========================================= */
const HandEvaluator = {
    // Returns { score: number, name: string }
    evaluate(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        
        // Convert to numerical ranks (Descending order)
        const ranks = allCards.map(c => c.rank).sort((a, b) => b - a);
        const suits = allCards.map(c => c.suit);

        const flushSuit = this.getFlushSuit(suits);
        const isStraight = this.checkStraight(ranks);
        const groups = this.getGroups(ranks);

        // --- Rank Checks ---
        // 1. Straight Flush
        if (flushSuit && isStraight) return { score: 8000 + ranks[0], name: "Straight Flush" };
        
        // 2. Four of a Kind
        if (groups[4]) return { score: 7000 + groups[4], name: "Four of a Kind" };
        
        // 3. Full House
        if (groups[3] && (groups[2] || groups.second3)) return { score: 6000 + groups[3], name: "Full House" };

        // 4. Flush
        if (flushSuit) return { score: 5000, name: "Flush" };

        // 5. Straight
        if (isStraight) return { score: 4000 + ranks[0], name: "Straight" };

        // 6. Three of a Kind
        if (groups[3]) return { score: 3000 + groups[3], name: "Three of a Kind" };

        // 7. Two Pair
        if (groups[2] && groups.secondPair) return { score: 2000 + groups[2], name: "Two Pair" };

        // 8. Pair
        if (groups[2]) return { score: 1000 + groups[2], name: "Pair" };

        // 9. High Card
        return { score: ranks[0], name: "High Card" };
    },

    getFlushSuit(suits) {
        const counts = {};
        for (let s of suits) {
            counts[s] = (counts[s] || 0) + 1;
            if (counts[s] >= 5) return s;
        }
        return null;
    },

    checkStraight(ranks) {
        const unique = [...new Set(ranks)];
        let consecutive = 0;
        for (let i = 0; i < unique.length - 1; i++) {
            if (unique[i] - unique[i+1] === 1) {
                consecutive++;
                if (consecutive >= 4) return true;
            } else {
                consecutive = 0;
            }
        }
        // Wheel check (Ace low straight: A, 5, 4, 3, 2)
        if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) return true;
        return false;
    },

    getGroups(ranks) {
        const counts = {};
        const groups = {};
        
        ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
        
        for (let rank in counts) {
            const count = counts[rank];
            const rNum = parseInt(rank);
            if (count === 4) groups[4] = rNum;
            if (count === 3) {
                if (groups[3]) groups.second3 = groups[3];
                groups[3] = (rNum > (groups[3] || 0)) ? rNum : groups[3];
            }
            if (count === 2) {
                if (groups[2]) groups.secondPair = groups[2];
                groups[2] = (rNum > (groups[2] || 0)) ? rNum : groups[2];
            }
        }
        return groups;
    }
};

/* =========================================
   5. POKER ENGINE
   ========================================= */
const pokerGame = {
    deck: new Deck(),
    hand: [],
    cpuHand: [],
    community: [],
    stage: 'idle',
    pot: 0,

    init() {
        document.getElementById('opponent-name').innerText = "Poker Bot";
        document.getElementById('poker-center').style.display = 'block';
        document.getElementById('blackjack-center').style.display = 'none';
        document.getElementById('poker-controls').style.display = 'flex';
        document.getElementById('blackjack-controls').style.display = 'none';
        clearTable();
        updatePot(0);
        updateStatus("Texas Hold'em. Press Deal.");
    },

    async startRound() {
        this.deck.reset();
        clearTable();
        this.community = [];
        this.pot = 20;
        updatePot(this.pot);
        this.stage = 'pre-flop';
        this.toggleButtons(false);

        this.hand = [this.deck.deal(), this.deck.deal()];
        this.cpuHand = [this.deck.deal(), this.deck.deal()];

        // Deal: P1, C1(down), P2, C2(down)
        await dealToUI('player-hand', this.hand[0]);
        await dealToUI('cpu-hand', this.cpuHand[0], true);
        await dealToUI('player-hand', this.hand[1]);
        await dealToUI('cpu-hand', this.cpuHand[1], true);

        updateStatus("Your Turn.");
        this.toggleButtons(true);
    },

    async nextPhase() {
        this.toggleButtons(false);

        if (this.stage === 'pre-flop') {
            this.stage = 'flop';
            this.pot += 50; updatePot(this.pot);
            updateStatus("Dealing Flop...");
            
            this.deck.deal(); // Burn
            for(let i=0; i<3; i++) {
                const c = this.deck.deal();
                this.community.push(c);
                await dealToUI('community-cards', c);
            }

        } else if (this.stage === 'flop') {
            this.stage = 'turn';
            this.pot += 100; updatePot(this.pot);
            updateStatus("Dealing Turn...");
            
            this.deck.deal(); // Burn
            const c = this.deck.deal();
            this.community.push(c);
            await dealToUI('community-cards', c);

        } else if (this.stage === 'turn') {
            this.stage = 'river';
            this.pot += 200; updatePot(this.pot);
            updateStatus("Dealing River...");
            
            this.deck.deal(); // Burn
            const c = this.deck.deal();
            this.community.push(c);
            await dealToUI('community-cards', c);

        } else if (this.stage === 'river') {
            this.stage = 'showdown';
            await this.revealCpuCards();
            this.determineWinner();
            return;
        }

        this.toggleButtons(true);
    },

    async revealCpuCards() {
        const cpuContainer = document.getElementById('cpu-hand');
        cpuContainer.innerHTML = ''; 
        for (const card of this.cpuHand) {
            await dealToUI('cpu-hand', card);
        }
    },

    determineWinner() {
        const pResult = HandEvaluator.evaluate(this.hand, this.community);
        const cResult = HandEvaluator.evaluate(this.cpuHand, this.community);

        let msg = "";
        if (pResult.score > cResult.score) {
            msg = `You Win with ${pResult.name}!`;
        } else if (cResult.score > pResult.score) {
            msg = `Dealer Wins with ${cResult.name}.`;
        } else {
            msg = `Push (Tie). Both had ${pResult.name}.`;
        }
        
        updateStatus(msg);

        // Set buttons to End State
        document.getElementById('poker-next').disabled = true;
        document.getElementById('poker-fold').disabled = true;
        document.getElementById('poker-deal').disabled = false;
    },

    toggleButtons(active) {
        document.getElementById('poker-next').disabled = !active;
        document.getElementById('poker-fold').disabled = !active;
        document.getElementById('poker-deal').disabled = active;
    }
};

/* =========================================
   6. BLACKJACK ENGINE
   ========================================= */
const blackjackGame = {
    deck: new Deck(),
    playerHand: [],
    dealerHand: [],
    gameOver: false,

    init() {
        document.getElementById('opponent-name').innerText = "Dealer";
        document.getElementById('poker-center').style.display = 'none';
        document.getElementById('blackjack-center').style.display = 'block';
        document.getElementById('poker-controls').style.display = 'none';
        document.getElementById('blackjack-controls').style.display = 'flex';
        clearTable();
        updatePot(0);
        updateStatus("Blackjack. Press New Deal.");
    },

    async startRound() {
        this.deck.reset();
        clearTable();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameOver = false;
        this.toggleButtons(false);

        const p1 = this.deck.deal(); this.playerHand.push(p1);
        await dealToUI('player-hand', p1);

        const d1 = this.deck.deal(); this.dealerHand.push(d1);
        await dealToUI('cpu-hand', d1);

        const p2 = this.deck.deal(); this.playerHand.push(p2);
        await dealToUI('player-hand', p2);

        const d2 = this.deck.deal(); this.dealerHand.push(d2);
        await dealToUI('cpu-hand', d2, true); // Face down

        this.checkScore();
        if(!this.gameOver) this.toggleButtons(true);
    },

    async hit() {
        this.toggleButtons(false);
        const card = this.deck.deal();
        this.playerHand.push(card);
        await dealToUI('player-hand', card);
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.endGame("Bust! You went over 21.");
        } else {
            updateStatus(`Total: ${score}`);
            this.toggleButtons(true);
        }
    },

    async stand() {
        this.toggleButtons(false);
        // Reveal Hole Card
        const cpuContainer = document.getElementById('cpu-hand');
        if(cpuContainer.lastChild) cpuContainer.removeChild(cpuContainer.lastChild);
        
        // Add the actual card
        await dealToUI('cpu-hand', this.dealerHand[1]);

        let dealerScore = this.calculateScore(this.dealerHand);
        
        while (dealerScore < 17) {
            await wait(600);
            const card = this.deck.deal();
            this.dealerHand.push(card);
            await dealToUI('cpu-hand', card);
            dealerScore = this.calculateScore(this.dealerHand);
        }

        this.determineWinner(dealerScore);
    },

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        hand.forEach(card => {
            if (['J','Q','K'].includes(card.value)) score += 10;
            else if (card.value === 'A') { score += 11; aces += 1; }
            else score += parseInt(card.value);
        });
        while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
        return score;
    },

    determineWinner(dealerScore) {
        const playerScore = this.calculateScore(this.playerHand);
        if (dealerScore > 21) updateStatus("Dealer Busts! You Win!");
        else if (dealerScore > playerScore) updateStatus(`Dealer wins (${dealerScore} vs ${playerScore}).`);
        else if (playerScore > dealerScore) updateStatus(`You Win (${playerScore} vs ${dealerScore})!`);
        else updateStatus("Push (Tie).");
        
        document.getElementById('bj-deal').disabled = false;
    },

    endGame(msg) {
        this.gameOver = true;
        updateStatus(msg);
        document.getElementById('bj-hit').disabled = true;
        document.getElementById('bj-stand').disabled = true;
        document.getElementById('bj-deal').disabled = false;
    },

    toggleButtons(active) {
        document.getElementById('bj-hit').disabled = !active;
        document.getElementById('bj-stand').disabled = !active;
        document.getElementById('bj-deal').disabled = active;
    },

    checkScore() {
        const score = this.calculateScore(this.playerHand);
        if(score === 21) {
             this.endGame("Blackjack! You Win!");
        } else {
             updateStatus(`Total: ${score}. Hit or Stand?`);
        }
    }
};

/* =========================================
   7. MAIN CONTROLLER
   ========================================= */
const menu = document.getElementById('main-menu');
const table = document.getElementById('table-container');
const controls = document.getElementById('controls-area');

// POKER BINDINGS
document.getElementById('select-poker').addEventListener('click', () => {
    menu.style.display = 'none';
    table.style.display = 'flex';
    controls.style.display = 'flex';
    pokerGame.init();
});
document.getElementById('poker-deal').addEventListener('click', () => pokerGame.startRound());
document.getElementById('poker-next').addEventListener('click', () => pokerGame.nextPhase());
document.getElementById('poker-fold').addEventListener('click', () => {
    updateStatus("Folded.");
    pokerGame.toggleButtons(false);
    document.getElementById('poker-deal').disabled = false;
});

// BLACKJACK BINDINGS
document.getElementById('select-blackjack').addEventListener('click', () => {
    menu.style.display = 'none';
    table.style.display = 'flex';
    controls.style.display = 'flex';
    blackjackGame.init();
});
document.getElementById('bj-deal').addEventListener('click', () => blackjackGame.startRound());
document.getElementById('bj-hit').addEventListener('click', () => blackjackGame.hit());
document.getElementById('bj-stand').addEventListener('click', () => blackjackGame.stand());

// EXIT
document.getElementById('exit-btn').addEventListener('click', () => {
    table.style.display = 'none';
    controls.style.display = 'none';
    menu.style.display = 'block';
});